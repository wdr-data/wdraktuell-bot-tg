import Telegraf from 'telegraf';

import { guessAttachmentType, getAttachmentId } from './attachments';

export class CustomContext extends Telegraf.Context {
    constructor(...args) {
        super(...args);
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
        const fileId = await getAttachmentId(url);
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
