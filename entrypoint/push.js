import request from 'request-promise-native';
import Raven from 'raven';
import RavenLambdaWrapper from 'serverless-sentry-lib';
import * as aws from 'aws-sdk';
import {
    Telegram,
    Markup,
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
import {
    getAttachmentId,
} from '../lib/attachments';
import { trackLink } from '../lib/util';


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
            const report = await request(params);
            console.log('Starting to send report with id:', report.id);
            await markSending(report.id, 'report');
            return {
                state: 'nextChunk',
                timing: 'breaking',
                type: 'report',
                data: report,
            };
        } catch (error) {
            console.log('Sending report failed: ', JSON.stringify(error, null, 2));
            throw error;
        }
    }

    try {
        let push, timing;
        if (event.manual) {
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
        await markSending(push.id, 'push');
        return {
            state: 'nextChunk',
            timing,
            type: 'push',
            data: push,
        };
    } catch (error) {
        console.log('Sending push failed: ', JSON.stringify(error, null, 2));
        throw error;
    }
});

const handlePushFailed = async (error) => {
    Raven.captureException(error);
    console.error(error);

    if (error.code === 'ETIMEDOUT') {
        console.error('Request timed out!');
    } else if (error.code !== 400) {
        console.error('Not a bad request!');
    }
};

export const send = RavenLambdaWrapper.handler(Raven, async (event) => {
    console.log(`attempting to push chunk for ${event.type}`, event.data.id);

    try {
        let users, last;
        const result = await getUsers(event.timing, event.start);
        users = result.users;
        last = result.last;

        if (users.length === 0) {
            return {
                state: 'finished',
                id: event.data.id,
                type: event.type,
            };
        }

        const bot = new Telegram(process.env.TG_TOKEN);

        if (event.type === 'report') {
            const report = event.data;

            const unsubscribeNote = 'Um Eilmeldungen abzubestellen, schreibe "Stop".';
            let messageText;
            if (report.type === 'breaking') {
                messageText = `🚨 ${report.summary}\n\n${unsubscribeNote}`;
            } else {
                messageText = report.summary;
            }

            let keyboard;

            if (report.link) {
                keyboard = Markup.inlineKeyboard([
                    [
                        Markup.urlButton(`🔗️ ${
                            report.short_headline
                        }`, trackLink(report)),
                    ],
                ]);
            }

            await Promise.all(users.map(async (user) => {
                try {
                    if (report.attachment) {
                        const attachmentId = await getAttachmentId(report.attachment.processed);
                        await bot.sendPhoto(user.tgid, attachmentId, {
                            caption: messageText,
                            // eslint-disable-next-line camelcase
                            reply_markup: keyboard,
                        });
                    } else {
                        await bot.sendMessage(user.tgid, messageText, {
                            // eslint-disable-next-line camelcase
                            reply_markup: keyboard,
                        });
                    }
                } catch (err) {
                    return handlePushFailed(err);
                }
            }));
        } else if (event.type === 'push') {
            const push = event.data;
            const bot = new Telegram(process.env.TG_TOKEN);
            const { messageText } = assemblePush(push);

            await Promise.all(users.map(async (user) => {
                try {
                    await bot.sendMessage(user.tgid, messageText, {
                        'parse_mode': 'HTML',
                        'disable_web_page_preview': true,
                    });
                } catch (err) {
                    return handlePushFailed(err);
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
            };
        }

        return {
            state: 'nextChunk',
            timing: event.timing,
            type: event.type,
            data: event.data,
            start: last,
            preview: event.preview,
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

    markSent(event.id, event.type)
        .then(() => callback(null, {}))
        .catch((err) => callback(err, {}));
});
