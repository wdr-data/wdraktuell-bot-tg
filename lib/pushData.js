import request from 'request-promise-native';
import moment from 'moment-timezone';
import { Markup } from 'telegraf';

import urls from './urls';
import { escapeHTML } from './util';

export async function getLatestPush(timing, filters = {}) {
    const today = new Date();
    const isoDate = today.toISOString().split('T')[0];

    let data;

    try {
        data = await request.get({
            uri: urls.pushes,
            json: true,
            qs: Object.assign(
                {
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

export async function markSent(id, type = 'push') {
    const now = moment.tz('Europe/Berlin').format();

    let uri;
    const body = { delivered: true };
    if (type === 'push') {
        uri = urls.push(id);
        body['delivered_date'] = now;
    } else if (type === 'report') {
        uri = urls.report(id);
    }

    try {
        const response = await request.patch({
            uri,
            json: true,
            body,
            headers: { Authorization: 'Token ' + process.env.CMS_API_TOKEN },
        });
        console.log(`Updated ${type} ${id} to delivered`, response);
    } catch (e) {
        console.log(`Failed to update ${type} ${id} to delivered`, e.message);
        throw e;
    }
}

export const assemblePush = (push) => {
    const bodies = push.reports
        .map(
            (report) =>
                `➡️ <b>${escapeHTML(report.headline)}</b>\n
        ${escapeHTML(report.text)}
        ${
    report.link
        ? `\n<a href=${report.link}>${escapeHTML(report.short_headline)}</a>` : ``}`
        )
        .join('\n\n');
    const messageText = `${escapeHTML(push.intro)}\n\n${bodies}\n\n${escapeHTML(push.outro)}`;

    const buttons = push.reports
        .filter((report) => report.link)
        .map((report) => [ Markup.urlButton(`🌍 ${report.short_headline}`, report.link) ]);

    return { messageText, buttons };
};

export default {
    getLatestPush,
    markSent,
    assemblePush,
};
