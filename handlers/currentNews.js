import request from 'request-promise-native';

import urls from '../lib/urls';
import { assemblePush } from '../lib/pushData';

export default async (ctx) => {
    const data = await request({
        uri: urls.pushes,
        json: true,
        qs: {
            limit: 1,
            delivered: true,
        },
    });

    const push = data.results[0];

    const { messageText } = assemblePush(push);
    await ctx.reply(messageText, {
        'parse_mode': 'HTML',
        'disable_web_page_preview': true,
    });
};
