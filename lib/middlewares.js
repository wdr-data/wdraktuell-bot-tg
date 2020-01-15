import uuidv4 from 'uuid/v4';

import DynamoDbCrud from './dynamodbCrud';
import { partition } from './util';

export const settingsMiddleware = async (ctx, next) => {
    const users = new DynamoDbCrud(process.env.DYNAMODB_USERS, 'tgid');
    const item = await users.load(ctx.from.id);
    if (item) {
        ctx.uuid = item.uuid;
    } else {
        const uuid = uuidv4();
        await users.create(ctx.from.id, { uuid });
        ctx.uuid = uuid;
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
