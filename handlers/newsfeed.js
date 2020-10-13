import request from 'request-promise-native';
import Markup from 'telegraf/markup';
import moment from 'moment';
import 'moment-timezone';

import urls from '../lib/urls';
import actionData from '../lib/actionData';
import { escapeHTML, trackLink } from '../lib/util';

const imageVariants = [
    'ARDFotogalerie',
    'gseapremiumxl',
    'TeaserAufmacher',
];

const getNews = async (index, options = { tag: 'Schlagzeilen' }) => {
    let response;
    if (options.tag === 'Schlagzeilen' ) {
        response = await request({
            uri: urls.curatedNewsFeed(index, 1),
            json: true,
        });
    } else {
        response = await request({
            uri: urls.newsfeedByTopicCategories(index, 1, options.tag),
            json: true,
        });
    }
    return createElement(response, index, options.tag);
};

const createElement = async (response, index, tag) => {
    let content = response.data[0];
    if (response.data[0].teaser) {
        content = response.data[0].teaser;
    }

    const headline = content.schlagzeile ? content.schlagzeile : content.title;
    let teaserText = '';
    if (content.teaserText) {
        if (content.teaserText.length > 1) {
            teaserText = content.teaserText
                .map((text) => ` • ${text}`)
                .join('\n');
        } else {
            teaserText = content.teaserText[0];
        }
    }
    const lastUpdate = moment(
        content.redaktionellerStand * 1000
    ).tz('Europe/Berlin').format('DD.MM.YY, HH:mm');

    // Get image url
    let imageUrl = 'https://www1.wdr.de/nachrichten/wdr-aktuell-telegram-messenger-100~_v-ARDFotogalerie.jpg';

    const mediaItems = Object.values(content.containsMedia).sort(
        (a, b) => a.index - b.index
    );
    const firstImageItem = mediaItems.find((e) => e.mediaType === 'image');

    if (firstImageItem) {
        const imageUrlTemplate = firstImageItem.url;

        const imageCandidates = imageVariants.map((variant) =>
            imageUrlTemplate.replace('%%FORMAT%%', variant)
        );

        const statuses = await Promise.allSettled(
            imageCandidates.map((url) => request.head(url))
        );
        imageUrl = imageCandidates.find(
            (candidate, i) => statuses[i].status === 'fulfilled'
        ) || imageUrl;
    }

    const text = `<b>${
        escapeHTML(headline)
    }</b>\n\n${
        escapeHTML(teaserText)
    }\n<i>${
        lastUpdate
    }</i>`;

    // tracklink
    const linkButton = Markup.urlButton(`🔗 Lesen`, trackLink(
        content.shareLink, {
            campaignType: `${tag}-newsfeed`,
            campaignName: headline,
            campaignId: 'bot',
        })
    );

    const navButtons = [];

    if (index > 1 ) {
        navButtons.push(
            Markup.callbackButton(
                '⬅️',
                actionData('newsfeed', {
                    next: index - 1,
                    tag,
                    track: {
                        category: 'Feature',
                        event: `Newsfeed`,
                        label: tag,
                        subType: index-1,
                    },
                })
            ),
        );
    }

    if (index < response.numFound) {
        navButtons.push(
            Markup.callbackButton(
                index === 1 ? 'Nächster Beitrag ➡️' : '➡️',
                actionData('newsfeed', {
                    next: index + 1,
                    tag,
                    track: {
                        category: 'Feature',
                        event: `Newsfeed`,
                        label: tag,
                        subType: index+1,
                    },
                })
            ));
    }

    const extra = Markup.inlineKeyboard([ [ linkButton ], navButtons ]).extra();
    extra.caption = text;
    extra['parse_mode'] = 'HTML';

    return { text, imageUrl, extra };
};

export const handleNewsfeedStart = async (ctx, options = { tag: 'Schlagzeilen' }) => {
    const { imageUrl, extra } = await getNews(1, options);
    return ctx.replyWithPhoto(imageUrl, extra);
};

export const handleNewsfeedPage = async (ctx) => {
    const options = { tag: ctx.data.tag };
    const { imageUrl, extra } = await getNews(ctx.data.next, options);
    const media ={ type: 'photo', media: imageUrl, caption: extra.caption, 'parse_mode': 'HTML' };
    return ctx.editMessageMedia(media, extra);
};
