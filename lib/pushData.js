import request from 'request-promise-native';
import moment from 'moment-timezone';

import urls from './urls';
import { escapeHTML, trackLink } from './util';

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
    const bodies = push.reports.filter((report) => report.type === 'regular')
        .map((report) => `🔸<b>${escapeHTML(report.headline)}</b> ${escapeHTML(report.summary)}
${report.link ?
        `🔗 <a href="${escapeHTML(trackLink(report, push))}">${
            escapeHTML(report.short_headline)
        }</a>`: ``}`
        )
        .join('\n\n');

    const lastBody = push.reports.filter((report) => report.type === 'last')
        .map((report) => `🙈 Zum Schluss: <b>${escapeHTML(report.headline)}</b> ${escapeHTML(report.summary)}
${report.link ?
        `🔗  <a href="${escapeHTML(report.link)}">${escapeHTML(report.short_headline)}</a>` : ``}`)
        .join('\n\n');

    const messageText = `${escapeHTML(push.intro)}\n\n${bodies}${lastBody}\n\n${escapeHTML(push.outro)}`;

    return {
        messageText
    };
};

export default {
    getLatestPush,
    markSent,
    assemblePush,
};
