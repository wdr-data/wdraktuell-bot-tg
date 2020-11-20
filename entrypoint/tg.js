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
import { handleShareBotCommand } from '../handlers/share';
import { actions } from '../handlers';
import handleDataPolicy from '../handlers/dataPolicy';
import handleReport from '../handlers/report';
import handleFragment from '../handlers/fragment';
import handleReportAudio from '../handlers/reportAudio';
import handleQuizResponse from '../handlers/quizResponse';
import handlePushOutro from '../handlers/pushOutro';
import { handleSurvey } from '../handlers/survey';
import {
    handleNewsfeedPage,
    handleNewsfeedStart,
    handleLocationRegions,
} from '../handlers/newsfeed';
import { handleLocation as handleLocationSchools } from '../handlers/locationSchools';
import { handleLocation as handleLocationCorona } from '../handlers/locationCorona';
import { handleFaq } from '../handlers/faq';
import { handlePodcast } from '../handlers/podcast';

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
        bot.action('survey', handleSurvey);
        bot.action('newsfeed', handleNewsfeedPage);
        bot.action('location_school', handleLocationSchools);
        bot.action('location_corona', handleLocationCorona);
        bot.action('location_region', handleLocationRegions);
        bot.action('podcast_0630', async (ctx) => handlePodcast(ctx));

        bot.command('einstellungen', handleSubscriptionsCommand);
        bot.command('datenschutz', handleDataPolicy);
        bot.command('teilen', handleShareBotCommand);
        bot.command('schlagzeilen', async (ctx) => handleNewsfeedStart(ctx));
        bot.command('features', async (ctx) => {
            ctx['data'] = { faq: 'list_of_features' };
            return handleFaq(ctx);
        });

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
