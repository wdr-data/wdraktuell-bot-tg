import request from 'request-promise-native';

import urls from '../lib/urls';
import fragmentSender from '../lib/fragmentSender';
import { escapeHTML } from '../lib/util';

export default async (ctx) => {
    await ctx.replyAttachment(ctx.data.audio);

    if ([ 'push', 'report', 'breaking' ].includes(ctx.data.type)) {
        const params = {
            uri: `${urls.report(ctx.data.report)}?withFragments=1`,
            json: true,
        };
        // Authorize so we can access unpublished items
        if (ctx.data.preview) {
            params.headers = { Authorization: 'Token ' + process.env.CMS_API_TOKEN };
        }
        const report = await request(params);
        const text = 'Du hörst <b>' + escapeHTML(report.headline) + '</b> 🎧';

        return fragmentSender(
            ctx, report.next_fragments, { text, extra: { 'parse_mode': 'HTML' } });
    }
};
