import uuidv4 from 'uuid/v4';

import DynamoDbCrud from './dynamodbCrud';
import { partition } from './util';
import Webtrekk from './webtrekk';

export const settingsMiddleware = async (ctx, next) => {
    const users = new DynamoDbCrud(process.env.DYNAMODB_USERS, 'tgid');
    const usersItem = await users.load(ctx.from.id);
    if (usersItem) {
        ctx.uuid = usersItem.uuid;
    } else {
        const uuid = uuidv4();
        await users.create(ctx.from.id, { uuid });
        ctx.uuid = uuid;
    }

    ctx.track = async (params) => { };
    ctx.trackingEnabled = undefined;
    const tracking = new DynamoDbCrud(process.env.DYNAMODB_TRACKING, 'tgid');
    const trackingItem = await tracking.load(ctx.from.id);
    if (trackingItem) {
        ctx.trackingEnabled = trackingItem.enabled;
        if (ctx.trackingEnabled) {
            ctx.webtrekk = new Webtrekk(
                ctx.uuid,
            );
            ctx.track = (params) =>
                ctx.webtrekk.track(params);
        }
    } else {
        ctx.trackingEnabled = undefined;
    }

    try {
        const userStates = new DynamoDbCrud(
            process.env.DYNAMODB_USERSTATES,
            'uuid'
        );
        const states = await userStates.load(ctx.uuid);
        if (states.surveyTime &&
            states.surveyTime + 7*24*60*60 > Math.floor(Date.now() / 1000)) {
            ctx.surveyMode = true;
            console.log('Survey mode enabled.');
        } else {
            ctx.surveyMode = false;
        }
    } catch (e) {
        ctx.surveyMode = false;
    }

    const subscriptions = new DynamoDbCrud(process.env.DYNAMODB_SUBSCRIPTIONS, 'tgid');
    const subscriptionsItem = await subscriptions.load(ctx.from.id);
    if (subscriptionsItem) {
        ctx.subscriptions = subscriptionsItem;
    } else {
        ctx.subscriptions = {};
    }

    return next();
};

export const actionDataMiddleware = async (ctx, next) => {
    if (!ctx.callbackQuery) {
        return next();
    }
    const [ action, dataEncoded ] = partition(ctx.callbackQuery.data, ':');
    ctx.callbackQuery.data = action;
    ctx.dataEncoded = dataEncoded;
    try {
        ctx.data = JSON.parse(ctx.dataEncoded);
    } catch (err) {
        const actionDataTable = new DynamoDbCrud(process.env.DYNAMODB_ACTIONDATA, 'uuid');
        const actionData = await actionDataTable.load(ctx.dataEncoded);
        ctx.data = actionData.data;
    }
    return next();
};

export const analyticsMiddleware = async (ctx, next) => {
    console.log(ctx.data);
    if (ctx.data && ctx.data.track) {
        ctx.track(ctx.data.track);
    }
    return next();
};

export const answerCallbackMiddleware = async (ctx, next) => {
    try {
        await next();
    } finally {
        if (ctx.callbackQuery) {
            await ctx.answerCbQuery();
        }
    }
};

export const removeKeyboardMiddleware = async (ctx, next) => {
    await next();
    if (ctx.data && ctx.data.removeKeyboard) {
        ctx.editMessageReplyMarkup();
    }
};

export const replyMiddleware = async (ctx, next) => {
    if (ctx.data && ctx.data.replyHTML) {
        await ctx.reply(ctx.data.replyHTML, { 'parse_mode': 'HTML' });
        delete ctx.data.replyHTML;
    }
    return next();
};
