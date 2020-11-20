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
    await ctx.reply(messageText, extra);
};
