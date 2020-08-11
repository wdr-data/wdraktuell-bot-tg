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

const getNews = async (index, options={ tag: 'Coronavirus' }) => {
    const { tag } = options;
    const response = await request({
        uri: urls.newsfeedByTopicCategories(index, 1, tag),
        json: true,
    });
    const headline = response.data[0].teaser.schlagzeile;
    const teaserText = response.data[0].teaser.teaserText.map((text) => ` • ${text}`).join('\n');
    const lastUpdate = moment(
        response.data[0].teaser.redaktionellerStand * 1000
    ).tz('Europe/Berlin').format('DD.MM.YY, HH:mm');

    // Get image url
    let imageUrl = 'https://www1.wdr.de/nachrichten/wdr-aktuell-app-icon-100~_v-TeaserAufmacher.jpg';

    const mediaItems = Object.values(response.data[0].teaser.containsMedia).sort(
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
        response.data[0].teaser.shareLink, {
            campaignType: 'newsfeed',
            campaignName: 'coronavirus',
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
                        label: 'Zurück',
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
                        label: 'Vor',
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

export const handleNewsfeedStart = async (ctx) => {
    const { imageUrl, extra } = await getNews(1);
    return ctx.replyWithPhoto(imageUrl, extra);
};

export const handleNewsfeedPage = async (ctx) => {
    const { imageUrl, extra } = await getNews(ctx.data.next);
    const media ={ type: 'photo', media: imageUrl, caption: extra.caption, 'parse_mode': 'HTML' };
    return ctx.editMessageMedia(media, extra);
};
