import request from 'request-promise-native';
import moment from 'moment-timezone';
import { Markup } from 'telegraf';

import urls from './urls';
import { escapeHTML } from './util';
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

export const assemblePush = async (push, preview) => {
    const regularBodies = push.teasers.map(
        (teaser) => {
            const headline = escapeHTML(teaser.headline);
            const text = escapeHTML(teaser.text);
            const link = teaser.link ?
                `\n🔗 <a href="${escapeHTML(teaser.link)}">${
                    escapeHTML(teaser.link_name)
                }</a>` : ``;
            return `➡ <b>${headline}</b> ${text}${link}`;
        });

    const bodies = regularBodies.join('\n\n');

    const messageText =
        `${escapeHTML(push.intro)}\n\n${bodies}\n\n👋 ${escapeHTML(push.outro)}`;

    // Promobuttons
    const buttons = push.promos.map((promo) => {
        return Markup.callbackButton(
            `✨ ${promo.short_headline}`,
            actionData('promo', {
                push: push.id,
                promo: promo.id,
                preview,
                track: {
                    category: push.timing === 'morning' ?
                        `Morgen-Push-${push.id}` :
                        `Abend-Push-${push.id}`,
                    event: 'Promo',
                    label: promo.short_headline,
                    publicationDate: push.pub_date,
                },
            }),
        );
    });

    // Check, if podcast is from today
    const show = '0630_by_WDR_aktuell_WDR_Online';
    const response = await request({
        uri: urls.documentsByShow(1, 1, show),
        json: true,
    });
    const podcast = response.data[0];

    const buttonPodcast = [];
    const buttonText = 'Morgen-Podcast 0630';

    if (moment.now() - moment(podcast.broadcastTime).tz('Europe/Berlin') < 24*60*60*1000) {
        buttonPodcast.push(Markup.callbackButton(
            buttonText,
            actionData('podcast_0630', {
                push: push.id,
                timing: push.timing,
                preview,
                track: {
                    category: push.timing === 'morning' ?
                        `Morgen-Push-${push.id}` :
                        `Abend-Push-${push.id}`,
                    event: 'Podcast',
                    label: '0630',
                },
            })));
    }

    const extra = {
        'parse_mode': 'HTML',
        'disable_web_page_preview': true,
    };

    extra['reply_markup'] = Markup.inlineKeyboard([ buttonPodcast, buttons ]);

    return {
        messageText,
        extra,
    };
};

export const assembleReport = (report) => {
    const headline = `<b>${escapeHTML(report.headline)}</b>`;

    const messageText = `${headline}\n\n${report.text}`;

    return { messageText };
};

export default {
    getLatestPush,
    markSent,
    assemblePush,
};
