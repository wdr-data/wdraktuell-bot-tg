import Telegraf from 'telegraf';
import uuidv4 from 'uuid/v4';

import DynamoDbCrud from './dynamodbCrud';
import { guessAttachmentType, getAttachmentId } from './attachments';

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

    async replyFullNewsBase(newsBaseObj, extra) {
        const fragments = [ newsBaseObj, ...newsBaseObj.next_fragments || [] ];
        const head = fragments.slice(0, -1);
        const tail = fragments.slice(-1)[0];

        for (const fragment of head) {
            if (fragment.media) {
                await this.replyWithAttachment(fragment.media);
            }
            await this.reply(fragment.text);
        }

        if (tail.media) {
            await this.replyWithAttachment(tail.media);
        }
        return this.reply(tail.text, extra);
    }

    async replyWithAttachment(url, extra) {
        const fileId = getAttachmentId(url);
        const type = guessAttachmentType(url);
        const sendMapping = {
            image: this.replyWithPhoto,
            document: this.replyWithDocument,
            audio: this.replyWithAudio,
            video: this.replyWithVideo,
        };
        return sendMapping[type](fileId, extra);
    }
}
