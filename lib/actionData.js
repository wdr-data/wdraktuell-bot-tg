import uuidv4 from 'uuid/v4';

import DynamoDbCrud from './dynamodbCrud';

const actionData = (action, data) => {
    const stringEncoded = `${action}:${JSON.stringify(data)}`;
    if (stringEncoded.length <= 64) {
        return stringEncoded;
    }
    const actionDataTable = new DynamoDbCrud(process.env.DYNAMODB_ACTIONDATA, 'uuid');
    const ttl = Math.floor(Date.now() / 1000) + 14*24*60*60; // 14 days
    const uuid = uuidv4();
    actionDataTable.create(uuid, { data, ttl });
    return `${action}:${uuid}`;
};

export default actionData;
