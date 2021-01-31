import request from 'request-promise-native';

import urls from '../lib/urls';
import { assemblePush } from '../lib/pushData';

export default async (ctx) => {
    const data = await request({
        uri: urls.pushes,
        json: true,
        qs: {
            limit: 1,
            'delivered_tg': 'sent',
        },
    });

    const push = data.results[0];

    const { messageText, extra } = await assemblePush(push);

    if (push.attachment) {
        if (messageText.length > 1000) {
            await ctx.replyWithAttachment(push.attachment.processed);
            return ctx.reply(messageText, extra);
        } else {
            extra.caption = messageText;
            return ctx.replyWithAttachment(push.attachment.processed, extra);
        }
    } else {
        return ctx.reply(messageText, extra);
    }
};
