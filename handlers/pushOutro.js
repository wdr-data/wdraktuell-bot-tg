import request from 'request-promise-native';
import { Markup } from 'telegraf';

import urls from '../lib/urls';
import { trackLink, regexSlug } from '../lib/util';

export default async (ctx) => {
    const params = {
        uri: `${urls.push(ctx.data.push)}`,
        json: true,
    };
    // Authorize so we can access unpublished items
    if (ctx.data.preview) {
        params.headers = { Authorization: 'Token ' + process.env.CMS_API_TOKEN };
    }
    const push = await request(params);

    const extra = {};
    if (push.link) {
        extra['reply_markup'] = Markup.inlineKeyboard([
            [
                Markup.urlButton( `🔗 ${push.link_name}`, trackLink(
                    push.link, {
                        campaignType: 'push_outro',
                        campaignName: regexSlug(`outro: ${push.link_name}`),
                        campaignId: push.id,
                    }),
                ),
            ],
        ]);
    }

    if (push.attachment) {
        await ctx.replyWithAttachment(push.attachment.processed, { caption: push.outro, ...extra });
    } else {
        return ctx.reply(push.outro, extra);
    }
};
