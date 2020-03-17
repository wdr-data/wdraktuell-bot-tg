import request from 'request-promise-native';
import moment from 'moment-timezone';

import urls from './urls';
import { escapeHTML, trackLink, regexSlug } from './util';

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

export const assemblePush = (push) => {
    const regularBodies = push.reports.filter((report) => report.type === 'regular')
        .map((report) => {
            const headline = escapeHTML(report.headline);
            const summary = escapeHTML(report.summary);
            const link = report.link ?
                `\n🔗 <a href="${escapeHTML(trackLink(report.link, {
                    campaignType: push.timing === 'morning' ? 'morgen_push' : 'abend_push',
                    campaignName: regexSlug(report.headline),
                    campaignId: report.id,
                }))}">${
                    escapeHTML(report.short_headline)
                }</a>` : ``;
            return `➡ <b>${headline}</b> ${summary}${link}`;
        });

    const lastBody = push.reports.filter((report) => report.type === 'last')
        .map((report) => {
            const headline = escapeHTML(report.headline);
            const summary = escapeHTML(report.summary);
            const link = report.link ?
                `\n🔗 <a href="${escapeHTML(trackLink(report.link, {
                    campaignType: push.timing === 'morning' ? 'morgen_push' : 'abend_push',
                    campaignName: regexSlug(report.headline),
                    campaignId: report.id,
                }))}">${
                    escapeHTML(report.short_headline)
                }</a>` : ``;
            return `🙈 <b>Zum Schluss: ${headline}</b> ${summary}${link}`;
        });

    const escapedBodies = regularBodies.concat(lastBody).join('\n\n');

    const outroLink = push.link ?
        `\n🔗 <a href="${escapeHTML(trackLink(push.link, {
            campaignType: push.timing === 'morning' ? 'morgen_push' : 'abend_push',
            campaignName: regexSlug(`outro: ${push.link_name}`),
            campaignId: push.id,
        }))}">${
            escapeHTML(push.link_name)
        }</a>` : ``;
    const escapedOutro = `${escapeHTML(push.outro)}${outroLink}`;

    const messageText =
        `${escapeHTML(push.intro)}\n\n${escapedBodies}\n\n${escapedOutro}`;

    return {
        messageText,
    };
};

export default {
    getLatestPush,
    markSent,
    assemblePush,
};
