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
} from '../lib/pushData';
import ddb from '../lib/dynamodb';
import { escapeHTML, trackLink, regexSlug, sleep } from '../lib/util';
import Webtrekk from '../lib/webtrekk';
import DynamoDbCrud from '../lib/dynamodbCrud';
import { CustomContext as Context } from '../lib/customContext';
import fragmentSender from '../lib/fragmentSender';


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

    if (event.report) {
        try {
            const params = {
                uri: `${urls.report(event.report)}?withFragments=1`,
                json: true,
            };
            // Authorize so we can access unpublished items
            if (event.preview) {
                params.headers = { Authorization: 'Token ' + process.env.CMS_API_TOKEN };
            }
            const report = await request(params);
            console.log('Starting to send report with id:', report.id);
            if (!event.preview) {
                await markSending(report.id, 'report');
            }
            return {
                state: 'nextChunk',
                timing: report.type,
                type: 'report',
                data: report,
                preview: event.preview,
                recipients: 0,
                blocked: 0,
            };
        } catch (error) {
            console.log('Sending report failed: ', JSON.stringify(error, null, 2));
            throw error;
        }
    }

    try {
        let push, timing;
        if (event.preview) {
            const params = {
                uri: urls.push(event.push),
                json: true,
            };
            // Authorize so we can access unpublished items
            params.headers = { Authorization: 'Token ' + process.env.CMS_API_TOKEN };
            push = await request(params);
        } else if (event.manual) {
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
                };
            }
            push = await getLatestPush(timing, {
                'delivered_tg': 'not_sent',
            });
        }
        console.log('Starting to send push with id:', push.id);
        if (!event.preview) {
            await markSending(push.id, 'push');
        }
        return {
            state: 'nextChunk',
            timing,
            type: 'push',
            data: push,
            preview: event.preview,
            recipients: 0,
            blocked: 0,
        };
    } catch (error) {
        console.log('Sending push failed: ', JSON.stringify(error, null, 2));
        throw error;
    }
});

const reasons = {
    UNKNOWN: 'unknown',
    TIMED_OUT: 'timed out',
    BLOCKED: 'blocked',
};

const handlePushFailed = async (error, tgid) => {
    Raven.captureException(error);
    console.error(error);

    if (error.code === 'ETIMEDOUT') {
        console.error('Request timed out!');
        return reasons.TIMED_OUT;
    } else if (
        error.code === 403 && error.description === 'Forbidden: bot was blocked by the user'
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
    const ctx = new Context(update, bot, {});
    ctx.data = {
        timing: report.type,
        report: report.id,
        type: 'report',
        quiz: report.is_quiz,
        audio: report.audio,
        preview: event.preview,
        track: {
            category: `Breaking-Push-${report.id}`,
            event: `Breaking Meldung`,
            label: report.subtype ?
                `${report.subtype.title}: ${report.headline}` :
                report.headline,
            subType: `1.Bubble (${report.question_count + 1})`,
            publicationDate: report.published_date,
        },
    };
    if (report.link) {
        let campaignType = 'breaking_push';
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

        if (event.preview) {
            users = [ { tgid: event.preview } ];
        } else {
            const result = await getUsers(event.timing, event.start);
            users = result.users;
            last = result.last;
        }

        if (users.length === 0) {
            return {
                state: 'finished',
                id: event.data.id,
                type: event.type,
                preview: event.preview,
                timing: event.timing,
                data: event.data,
                recipients: event.recipients,
                blocked: event.blocked,
            };
        }

        await sleep(1000);

        const bot = new Telegram(process.env.TG_TOKEN);

        if (event.type === 'report') {
            const report = event.data;

            let headline;
            let unsubscribeNote = '';
            if (report.type === 'breaking') {
                unsubscribeNote = '\n\nUm Eilmeldungen abzubestellen, schreibe "Stop".';
                headline = `🚨 <b>${escapeHTML(report.headline)}</b>`;
            } else {
                headline = `<b>${escapeHTML(report.headline)}</b>`;
            }

            const messageText = `${headline}\n\n${report.text}${unsubscribeNote}`;

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
                    event.recipients++;
                } catch (err) {
                    const reason = await handlePushFailed(err, user.tgid);
                    if (reason === reasons.BLOCKED) {
                        event.blocked++;
                    }
                }
            }));
        } else if (event.type === 'push') {
            const push = event.data;
            const bot = new Telegram(process.env.TG_TOKEN);
            const { messageText, extra } = assemblePush(push, event.preview);

            await Promise.all(users.map(async (user) => {
                try {
                    await bot.sendMessage(user.tgid, messageText, extra);
                    event.recipients++;
                } catch (err) {
                    const reason = await handlePushFailed(err, user.tgid);
                    if (reason === reasons.BLOCKED) {
                        event.blocked++;
                    }
                }
            }));
        }
        console.log(`${event.type} sent to ${users.length} users`);

        // LastEvaluatedKey is empty, scan is finished
        if (!last) {
            return {
                state: 'finished',
                id: event.data.id,
                type: event.type,
                preview: event.preview,
                timing: event.timing,
                data: event.data,
                recipients: event.recipients,
                blocked: event.blocked,
            };
        }

        return {
            state: 'nextChunk',
            timing: event.timing,
            type: event.type,
            data: event.data,
            start: last,
            preview: event.preview,
            recipients: event.recipients,
            blocked: event.blocked,
        };
    } catch (err) {
        console.error('Sending failed:', err);
        throw err;
    }
});

export function getUsers(timing, start = null, limit = 24) {
    const params = {
        Limit: limit,
        TableName: process.env.DYNAMODB_SUBSCRIPTIONS,
        FilterExpression: `${timing} = :p`,
        ExpressionAttributeValues: {
            ':p': true,
        },
    };

    if (start) {
        params.ExclusiveStartKey = start;
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

    if (event.preview) {
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
    }
    webtrekk.track({
        category: trackCategory,
        event: 'Zugestellt',
        label: event.data.headline,
        publicationDate: event.data.pub_date || event.data.published_date,
        recipients: event.recipients,
        blocked: event.blocked,
    });

    markSent(event.id, event.type)
        .then(() => callback(null, {}))
        .catch((err) => callback(err, {}));
});
