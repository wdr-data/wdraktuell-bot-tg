import request from 'request-promise-native';
import Raven from 'raven';
import RavenLambdaWrapper from 'serverless-sentry-lib';
import * as aws from 'aws-sdk';
import {
    Telegram,
} from 'telegraf';

import getTiming from '../lib/timing';
import urls from '../lib/urls';
import {
    getLatestPush,
    assemblePush,
    markSending,
    markSent,
    assembleReport,
} from '../lib/pushData';
import ddb from '../lib/dynamodb';
import { trackLink, regexSlug, sleep } from '../lib/util';
import Webtrekk from '../lib/webtrekk';
import DynamoDbCrud from '../lib/dynamodbCrud';
import { CustomContext as Context } from '../lib/customContext';
import fragmentSender from '../lib/fragmentSender';


const fromPrevious = (event, change) => ({
    timing: event.timing,
    type: event.type,
    data: event.data,
    options: event.options,
    stats: event.stats,
    ...change,
});


export const proxy = RavenLambdaWrapper.handler(Raven, async (event) => {
    const params = {
        stateMachineArn: process.env.statemachine_arn,
        input: typeof event === 'string' ? event : JSON.stringify(event),
    };

    const stepfunctions = new aws.StepFunctions();

    await stepfunctions.startExecution(params).promise();
    console.log('started execution of step function');
    return {
        statusCode: 200,
        body: 'OK',
    };
});

export const fetch = RavenLambdaWrapper.handler(Raven, async (event) => {
    console.log(JSON.stringify(event, null, 2));

    if ('body' in event) {
        event = JSON.parse(event.body);
    }

    // Ensure options are always set
    event.options = event.options || {};

    if (event.report) {
        return fetchReport(event);
    } else if (event.push) {
        return fetchPush(event);
    }
});

const fetchReport = async (event) => {
    try {
        const params = {
            uri: `${urls.report(event.report)}?withFragments=1`,
            json: true,
        };
        // Authorize so we can access unpublished items
        if (event.options.preview) {
            params.headers = { Authorization: 'Token ' + process.env.CMS_API_TOKEN };
        }
        const report = await request(params);
        console.log('Starting to send report with id:', report.id);
        if (!event.options.preview) {
            await markSending(report.id, 'report');
        }
        return {
            state: 'nextChunk',
            timing: report.type,
            type: 'report',
            data: report,
            options: event.options,
            stats: {
                recipients: 0,
                blocked: 0,
            },
        };
    } catch (error) {
        console.log('Sending report failed: ', JSON.stringify(error, null, 2));
        throw error;
    }
};

const fetchPush = async (event) => {
    try {
        let push, timing;
        if (event.options.preview) {
            const params = {
                uri: urls.push(event.push),
                json: true,
            };
            // Authorize so we can access unpublished items
            params.headers = { Authorization: 'Token ' + process.env.CMS_API_TOKEN };
            push = await request(params);
        } else if (event.options.manual) {
            const params = {
                uri: urls.push(event.push),
                json: true,
            };
            push = await request(params);
            timing = push.timing;
        } else {
            try {
                timing = getTiming(event);
            } catch (e) {
                console.log(e);
                return {
                    state: 'finished',
                    error: true,
                    options: event.options,
                };
            }
            push = await getLatestPush(timing, {
                'delivered_tg': 'not_sent',
            });
        }
        console.log('Starting to send push with id:', push.id);
        if (!event.options.preview) {
            await markSending(push.id, 'push');
        }
        return {
            state: 'nextChunk',
            timing,
            type: 'push',
            data: push,
            options: event.options,
            stats: {
                recipients: 0,
                blocked: 0,
            },
        };
    } catch (error) {
        console.log('Sending push failed: ', JSON.stringify(error, null, 2));
        throw error;
    }
};

const reasons = {
    UNKNOWN: 'unknown',
    TIMED_OUT: 'timed out',
    BLOCKED: 'blocked',
};

const handlePushFailed = async (error, tgid) => {
    Raven.captureException(error);
    console.error(error);

    const blockedErrors = [
        'Forbidden: bot was blocked by the user',
        'Forbidden: user is deactivated',
    ];

    if (error.code === 'ETIMEDOUT') {
        console.error('Request timed out!');
        return reasons.TIMED_OUT;
    } else if (
        error.code === 403 && blockedErrors.includes(error.description)
    ) {
        const subscriptions = new DynamoDbCrud(process.env.DYNAMODB_SUBSCRIPTIONS, 'tgid');
        await subscriptions.remove(tgid);
        return reasons.BLOCKED;
    }
    return reasons.UNKNOWN;
};

const makeFakeContext = (bot, user, event) => {
    const report = event.data;
    const update = {
        'update_id': 1,
        message: {
            from: {
                id: user.tgid,
            },
            chat: {
                id: user.tgid,
                type: 'private',
            },
        },
    };

    const typeMapping = {
        morning: 'Morgen',
        evening: 'Abend',
        breaking: 'Breaking',
        notification: 'Benachrichtigungs',
    };

    const ctx = new Context(update, bot, {});
    ctx.data = {
        timing: report.type,
        report: report.id,
        type: 'report',
        quiz: report.is_quiz,
        audio: report.audio,
        preview: event.options.preview,
        track: {
            category: `Report-Push-${report.id}`,
            event: `${typeMapping[report.type]} Meldung`,
            label: report.subtype ?
                `${report.subtype.title}: ${report.headline}` :
                report.headline,
            subType: `1.Bubble (${report.question_count + 1})`,
            publicationDate: report.published_date,
        },
    };
    if (report.link) {
        let campaignType = `${typeMapping[report.type].toLowerCase()}_push`;
        ctx.data.link = trackLink(
            report.link, {
                campaignType,
                campaignName: regexSlug(report.headline),
                campaignId: report.id,
            }
        );
    }
    return ctx;
};

export const send = RavenLambdaWrapper.handler(Raven, async (event) => {
    console.log(`attempting to push chunk for ${event.type}`, event.data.id);

    try {
        let users, last;

        if (event.options.preview) {
            users = [ { tgid: event.options.preview } ];
        } else {
            const result = await getUsers(event);
            users = result.users;
            last = result.last;
        }

        if (users.length === 0) {
            return fromPrevious(event, {
                state: 'finished',
                id: event.data.id,
            });
        }

        await sleep(1000);

        const bot = new Telegram(process.env.TG_TOKEN);

        if (event.type === 'report') {
            await sendReport(event, bot, users);
        } else if (event.type === 'push') {
            await sendPush(event, bot, users);
        }
        console.log(`${event.type} sent to ${users.length} users`);

        // LastEvaluatedKey is empty, scan is finished
        if (!last) {
            return fromPrevious(event, {
                state: 'finished',
                id: event.data.id,
            });
        }

        return fromPrevious(event, {
            state: 'nextChunk',
            start: last,
        });
    } catch (err) {
        console.error('Sending failed:', err);
        throw err;
    }
});

const sendReport = async (event, bot, users) => {
    const report = event.data;

    const { messageText } = assembleReport(report);

    await Promise.all(users.map(async (user) => {
        const ctx = makeFakeContext(bot, user, event);
        try {
            await fragmentSender(
                ctx,
                report.next_fragments,
                {
                    ...report,
                    text: messageText,
                    extra: {
                        'parse_mode': 'HTML',
                        'disable_web_page_preview': true,
                    },
                }
            );
            event.stats.recipients++;
        } catch (err) {
            const reason = await handlePushFailed(err, user.tgid);
            if (reason === reasons.BLOCKED) {
                event.stats.blocked++;
            }
        }
    }));
};

const sendPush = async (event, bot, users) => {
    const push = event.data;
    const { messageText, extra } = assemblePush(push, event.options.preview);

    await Promise.all(users.map(async (user) => {
        try {
            await bot.sendMessage(user.tgid, messageText, extra);
            event.stats.recipients++;
        } catch (err) {
            const reason = await handlePushFailed(err, user.tgid);
            if (reason === reasons.BLOCKED) {
                event.stats.blocked++;
            }
        }
    }));
};

export function getUsers(event, limit = 24) {
    let FilterExpression = `${event.timing} = :p`;

    if (event.options.timings) {
        FilterExpression = event.options.timings.map((timing) => `${timing} = :p`).join(' or ');
    }

    const params = {
        Limit: limit,
        TableName: process.env.DYNAMODB_SUBSCRIPTIONS,
        FilterExpression,
        ExpressionAttributeValues: {
            ':p': true,
        },
    };

    if (event.start) {
        params.ExclusiveStartKey = event.start;
    }
    return new Promise((resolve, reject) => {
        ddb.scan(params, (err, data) => {
            if (err) {
                return reject(err);
            }
            resolve({
                users: data.Items,
                last: data.LastEvaluatedKey,
            });
        });
    });
}

export const finish = RavenLambdaWrapper.handler(Raven, function(event, context, callback) {
    console.log(`Sending of ${event.type} finished:`, event);

    if (event.error) {
        console.log('Error state, exiting early');
        return;
    }

    if (event.options.preview) {
        console.log(`Only a preview, not marking as sent.`);
        return callback(null, {});
    }

    if (!event.id) {
        return callback(null, {});
    }

    const webtrekk = new Webtrekk('TG12345');
    let trackCategory = 'Preview';
    switch (event.timing) {
    case 'morning':
        trackCategory = `Morgen-Push-${event.data.id}`;
        break;
    case 'evening':
        trackCategory = `Abend-Push-${event.data.id}`;
        break;
    case 'breaking':
        trackCategory = `Breaking-Push-${event.data.id}`;
        break;
    case 'notification':
        trackCategory = `Benachrichtigungs-Push-${event.data.id}`;
    }
    webtrekk.track({
        category: trackCategory,
        event: 'Zugestellt',
        label: event.data.headline,
        publicationDate: event.data.pub_date || event.data.published_date,
        recipients: event.stats.recipients,
        blocked: event.stats.blocked,
    });

    markSent(event.id, event.type)
        .then(() => callback(null, {}))
        .catch((err) => callback(err, {}));
});
