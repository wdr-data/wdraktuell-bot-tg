import Telegraf from 'telegraf';
import uuidv4 from 'uuid/v4';

import DynamoDbCrud from './dynamodbCrud';

export class CustomContext extends Telegraf.Context {
    async uuid() {
        const users = new DynamoDbCrud(process.env.DYNAMODB_USERS, 'tgid');
        const item = await users.load(this.from.id);

        if (item) {
            return item.uuid;
        } else {
            const newUuid = uuidv4();
            await users.create(this.from.id, { uuid: newUuid });
            return newUuid;
        }
    }
}
