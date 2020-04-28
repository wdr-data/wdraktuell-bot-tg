import request from 'request-promise-native';
import moment from 'moment-timezone';
import { Markup } from 'telegraf';

import urls from './urls';
import { escapeHTML, trackLink, regexSlug } from './util';
import actionData from './actionData';

export async function getLatestPush(timing, filters = {}) {
    const today = new Date();
    const isoDate = today.toISOString().split('T')[0];

    let data;

    try {
        data = await request.get({
            uri: urls.pushes,
            json: true,
            qs: Object.assign({
                timing: timing,
                'pub_date': isoDate,
                limit: 1,
            },
            filters
            ),
        });
    } catch (e) {
        console.log('Querying push failed: ', JSON.stringify(e, null, 2));
        throw new Error(`Querying push failed: ${e.message}`);
    }

    if (!('results' in data && data.results.length > 0)) {
        throw new Error('No Push found');
    }
    return data.results[0];
}

export async function markSending(id, type = 'push') {
    const uri = urls[type](id);

    try {
        const response = await request.patch({
            uri,
            json: true,
            body: {
                'delivered_tg': 'sending',
            },
            headers: {
                Authorization: 'Token ' + process.env.CMS_API_TOKEN,
            },
        });
        console.log(`Updated ${type} ${id} to 'sending'`, response);
    } catch (e) {
        console.log(`Failed to update ${type} ${id} to 'sending'`, e.message);
    }
}

export async function markSent(id, type = 'push') {
    const now = moment.tz('Europe/Berlin').format();

    let uri;
    const body = {
        'delivered_tg': 'sent',
    };
    if (type === 'push') {
        uri = urls.push(id);
        body['delivered_date_tg'] = now;
    } else if (type === 'report') {
        uri = urls.report(id);
    }

    try {
        const response = await request.patch({
            uri,
            json: true,
            body,
            headers: {
                Authorization: 'Token ' + process.env.CMS_API_TOKEN,
            },
        });
        console.log(`Updated ${type} ${id} to 'sent'`, response);
    } catch (e) {
        console.log(`Failed to update ${type} ${id} to 'sent'`, e.message);
        throw e;
    }
}

export const assemblePush = (push, preview) => {
    const regularBodies = push.reports.filter((report) => report.type === 'regular')
        .map((report) => {
            const headline = escapeHTML(report.headline);
            const summary = escapeHTML(report.summary);
            const url = trackLink(report.link, {
                campaignType: push.timing === 'morning' ? 'morgen_push' : 'abend_push',
                campaignName: regexSlug(report.headline),
                campaignId: report.id,
            });
            const link = report.link ?
                `\n🔗 <a href="${escapeHTML(url)}">${
                    escapeHTML(report.short_headline)
                }</a>` : ``;
            return `➡ <b>${headline}</b> ${summary}${link}`;
        });

    const lastBody = push.reports.filter((report) => report.type === 'last')
        .map((report) => {
            const headline = escapeHTML(report.headline);
            const summary = escapeHTML(report.summary);
            const url = trackLink(report.link, {
                campaignType: push.timing === 'morning' ? 'morgen_push' : 'abend_push',
                campaignName: regexSlug(report.headline),
                campaignId: report.id,
            });
            const link = report.link ?
                `\n🔗 <a href="${escapeHTML(url)}">${
                    escapeHTML(report.short_headline)
                }</a>` : ``;
            const subtype = report.subtype;
            const title = escapeHTML(subtype.title);
            return `${subtype.emoji} <b>${title}: ${headline}</b> ${summary}${link}`;
        });

    const bodies = regularBodies.concat(lastBody).join('\n\n');

    const outroUrl = trackLink(push.link, {
        campaignType: push.timing === 'morning' ? 'morgen_push' : 'abend_push',
        campaignName: regexSlug(`outro: ${push.link_name}`),
        campaignId: push.id,
    });
    const outroLink = push.link ?
        `\n🔗 <a href="${escapeHTML(outroUrl)}">${
            escapeHTML(push.link_name)
        }</a>` : ``;
    const outro = `${escapeHTML(push.outro)}${outroLink}`;

    const messageText =
        `${escapeHTML(push.intro)}\n\n${bodies}\n\n${outro}`;

    const buttons = push.reports.map((r) => {
        let buttonText;

        if (r.type === 'last') {
            buttonText = `${r.subtype.emoji} ${r.subtype.title}`;
        } else if (r.short_headline) {
            buttonText = `➡ ${r.short_headline}`;
        } else {
            buttonText = `➡ ${r.headline}`;
        }
        return Markup.callbackButton(
            buttonText,
            actionData('report', {
                push: push.id,
                timing: push.timing,
                report: r.id,
                type: 'push',
                before: [],
                preview,
                track: {
                    category: push.timing === 'morning' ? 'Morgen-Push' : 'Abend-Push',
                    event: r.subtype ? `Meldung: ${r.subtype.title}` : 'Meldung',
                    label: r.headline,
                    subType: '1.Bubble',
                    publicationDate: r.published_date,
                },
            }),
        );
    });

    const extra = {
        'parse_mode': 'HTML',
        'disable_web_page_preview': true,
    };

    if (buttons) {
        extra['reply_markup'] = Markup.inlineKeyboard(buttons.map((button) => [ button ]));
    }

    return {
        messageText,
        extra,
    };
};

export default {
    getLatestPush,
    markSent,
    assemblePush,
};
