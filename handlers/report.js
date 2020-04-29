import request from 'request-promise-native';

import urls from '../lib/urls';
import { trackLink, regexSlug, escapeHTML } from '../lib/util';
import fragmentSender from '../lib/fragmentSender';

export default async (ctx) => {
    const params = {
        uri: `${urls.report(ctx.data.report)}?withFragments=1`,
        json: true,
    };
    // Authorize so we can access unpublished items
    if (ctx.data.preview) {
        params.headers = { Authorization: 'Token ' + process.env.CMS_API_TOKEN };
    }
    const report = await request(params);


    if (report.is_quiz) {
        ctx.data.quiz = true;
    }
    if (report.link) {
        let campaignType = 'themen_feature';
        switch (ctx.data.timing) {
        case 'morning':
            campaignType = 'morgen_push';
            break;
        case 'evening':
            campaignType = 'abend_push';
            break;
        }
        ctx.data.link = trackLink(
            report.link, {
                campaignType,
                campaignName: regexSlug(report.headline),
                campaignId: report.id,
            }
        );
    }

    if (report.audio) {
        ctx.data.audio = report.audio;
    }

    let text;
    if (report.type === 'last') {
        text = `<b>${
            escapeHTML(report.subtype.emoji)
        } ${
            escapeHTML(report.subtype.title)
        }: ${
            escapeHTML(report.headline)
        }</b> ${escapeHTML(report.text)}`;
    } else {
        text = `<b>${escapeHTML(report.headline)}</b> ${escapeHTML(report.text)}`;
    }

    return fragmentSender(
        ctx, report.next_fragments, { ...report, text, extra: { 'parse_mode': 'HTML' } });
};
