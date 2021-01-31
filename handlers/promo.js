import request from 'request-promise-native';
import { Markup } from 'telegraf';

import urls from '../lib/urls';

export const handlePromo = async (ctx) => {
    const params = {
        uri: `${urls.push(ctx.data.push)}`,
        json: true,
    };
    // Authorize so we can access unpublished items
    if (ctx.data.preview) {
        params.headers = { Authorization: 'Token ' + process.env.CMS_API_TOKEN };
    }
    const push = await request(params);

    const promo = push.promos.filter((promo) => promo.id === ctx.data.promo)[0];

    if (!promo) {
        return ctx.reply('Dieser Content ist nicht mehr verfügbar.');
    }

    const { attachment, text, link, link_name: linkName } = promo;
    const extra = {};

    if (link) {
        const linkButtonText = `🔗 ${linkName || 'Mehr'}`;
        const linkButton = Markup.urlButton(
            linkButtonText,
            link,
        );
        extra['reply_markup'] = Markup.inlineKeyboard([ linkButton ]);
    }

    if (promo.attachment) {
        extra.caption = text;
        return ctx.replyWithAttachment(attachment.processed, extra);
    } else {
        return ctx.reply(text, extra);
    }
};
