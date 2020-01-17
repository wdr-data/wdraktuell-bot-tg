import request from 'request-promise-native';
import { Markup } from 'telegraf';

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

    const { messageText, buttons } = assemblePush(push);
    await ctx.reply(messageText, {
        // eslint-disable-next-line camelcase
        reply_markup: buttons.length ? Markup.inlineKeyboard(buttons) : undefined,
    });
};
