import uuidv4 from 'uuid/v4';
import ua from 'universal-analytics';

import DynamoDbCrud from './dynamodbCrud';
import { partition } from './util';

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

    const tracking = new DynamoDbCrud(process.env.DYNAMODB_TRACKING, 'tgid');
    const trackingItem = await tracking.load(ctx.from.id);
    ctx.track = (category, event, label) => {};
    if (trackingItem) {
        ctx.trackingEnabled = trackingItem.enabled;
        if (ctx.trackingEnabled) {
            ctx.ua = ua(
                process.env.UA_TRACKING_ID,
                ctx.uuid,
            );
            ctx.track = (category, event, label) => ctx.ua.event(category, event, label).send();
        }
    } else {
        ctx.trackingEnabled = undefined;
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
    if (ctx.data.category) {
        await ctx.track(
            ctx.data.category,
            ctx.data.event,
            ctx.data.label
        );
    }
    return next();
};
