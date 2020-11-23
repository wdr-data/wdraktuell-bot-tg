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

export const assemblePush = async (push, preview) => {
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

    const bodies = regularBodies.join('\n\n');

    let outroText = '';
    if (!push.link && push.reports.filter((r) => r.type === 'last').length === 0) {
        outroText = `\n\n${escapeHTML(push.outro)}`;
    }

    const messageText =
        `${escapeHTML(push.intro)}\n\n${bodies}${outroText}`;

    const regularReportIds = push.reports.filter((r) => r.type !== 'last').map((r) => r.id);
    const buttons = push.reports.filter((r) => r.type === 'last').map((r, cnt) => {
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
                before: regularReportIds,
                preview,
                removeKeyboard: true,
                track: {
                    category: push.timing === 'morning' ?
                        `Morgen-Push-${push.id}` :
                        `Abend-Push-${push.id}`,
                    event: r.subtype ? 'Letzte Meldung' : `${cnt+1}.Meldung`,
                    label: r.subtype ? `${r.subtype.title}: ${r.headline}` : r.headline,
                    subType: `1.Bubble (${r.question_count + 1})`,
                    publicationDate: r.published_date,
                },
            }),
        );
    });

    if (!outroText) {
        const outroTitle = push.link ? '🏁 Zum Schluss' : '👋 Und Tschüss';
        buttons.push(
            Markup.callbackButton(
                outroTitle,
                actionData('push_outro', {
                    push: push.id,
                    timing: push.timing,
                    preview,
                    track: {
                        category: push.timing === 'morning' ?
                            `Morgen-Push-${push.id}` :
                            `Abend-Push-${push.id}`,
                        event: 'Outro',
                        label: push.link_name ?
                            `Zum Schluss: ${push.link_name}` :
                            `Und Tschüss`,
                        subType: '1.Bubble-Direkt (1)',
                    },
                }))
        );
    }

    // Check, if podcast is from today
    const show = '0630_by_WDR_aktuell_WDR_Online';
    const response = await request({
        uri: urls.documentsByShow(1, 1, show),
        json: true,
    });
    const podcast = response.data[0];

    const buttonPodcast = [];
    let buttonText = 'Morgen-Podcast 0630';
    if (moment.now() - moment('2020-11-21')< 7*24*60*60*1000) {
        buttonText = '✨Neu✨ ' + buttonText;
    }
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
    let headline;
    let unsubscribeNote = '';
    if (report.type === 'breaking') {
        unsubscribeNote = '\n\nUm Eilmeldungen abzubestellen, schreibe "Stop".';
        headline = `🚨 <b>${escapeHTML(report.headline)}</b>`;
    } else {
        headline = `<b>${escapeHTML(report.headline)}</b>`;
    }

    const messageText = `${headline}\n\n${report.text}${unsubscribeNote}`;

    if (!report.attachment && report.type === 'breaking') {
        report.attachment = {
            processed: 'https://images.informant.einslive.de/TG_Eilmeldung_7-2b2154a9-3616-4eff-930d-1f4d789dd072.png',
            title: 'Eilmeldung',
        };
    }

    return { messageText };
};

export default {
    getLatestPush,
    markSent,
    assemblePush,
};
