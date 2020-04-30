import Raven from 'raven';
import Telegraf from 'telegraf';
import RavenLambdaWrapper from 'serverless-sentry-lib';

import { CustomContext } from '../lib/customContext';
import { getAttachmentId } from '../lib/attachments';
import handleText from '../handlers/text';
import {
    actionDataMiddleware,
    settingsMiddleware,
    analyticsMiddleware,
    answerCallbackMiddleware,
    removeKeyboardMiddleware,
    replyMiddleware,
} from '../lib/middlewares';
import {
    handleStart,
    handleOnboardingAnalytics,
    handleOnboardingPushWhen,
    handleOnboardingPushBreaking,
} from '../handlers/onboarding';
import { handleSubscriptionsCommand } from '../handlers/subscriptions';
import { actions } from '../handlers';
import handleDataPolicy from '../handlers/dataPolicy';
import handleReport from '../handlers/report';
import handleFragment from '../handlers/fragment';
import handleReportAudio from '../handlers/reportAudio';
import handleQuizResponse from '../handlers/quizResponse';
import handlePushOutro from '../handlers/pushOutro';

const checkForToken = (event) => decodeURIComponent(
    event.pathParameters.token) === process.env.TG_TOKEN;

export const update = async (event, context, callback) => {
    if (!checkForToken(event)) {
        callback(null, {
            statusCode: 403,
            body: '',
        });
        Raven.captureMessage('illegal token');
        return;
    }

    const bot = new Telegraf(process.env.TG_TOKEN, { contextType: CustomContext });
    try {
        const payload = JSON.parse(event.body);

        callback(null, {
            statusCode: 200,
            body: '',
        });

        console.log(JSON.stringify(payload, null, 2));

        bot.use(settingsMiddleware);
        bot.use(actionDataMiddleware);
        bot.use(analyticsMiddleware);
        bot.use(answerCallbackMiddleware);
        bot.use(removeKeyboardMiddleware);
        bot.use(replyMiddleware);

        bot.start(handleStart);
        bot.action('onboarding_analytics', handleOnboardingAnalytics);
        bot.action('onboarding_push_when', handleOnboardingPushWhen);
        bot.action('onboarding_push_breaking', handleOnboardingPushBreaking);

        bot.action('report', handleReport);
        bot.action('fragment', handleFragment);
        bot.action('report_audio', handleReportAudio);
        bot.action('quiz_response', handleQuizResponse);
        bot.action('push_outro', handlePushOutro);

        bot.command('einstellungen', handleSubscriptionsCommand);
        bot.command('datenschutz', handleDataPolicy);

        for (const [ action, handler ] of Object.entries(actions)) {
            bot.action(action, handler);
        }

        bot.hears(() => true, handleText);

        bot.catch((err, ctx) => {
            console.error('ERROR:', err);
            Raven.captureException(err);
            return ctx.reply('🐞 Da ist was schief gelaufen. ' +
                'Die Crew ist bereits im Maschinenraum und sucht nach dem Bug!');
        });

        await bot.handleUpdate(payload);
    } catch (error) {
        console.error('ERROR:', error);
        Raven.captureException(error);
    }
};

export const attachment = RavenLambdaWrapper.handler(Raven, async (event) => {
    let payload;
    if (typeof event.body === 'object') {
        payload = event.body;
    } else {
        payload = JSON.parse(event.body);
    }
    const url = payload.url;

    const id = await getAttachmentId(url);
    return {
        statusCode: 200,
        body: JSON.stringify({ success: true, message: id }),
    };
});
