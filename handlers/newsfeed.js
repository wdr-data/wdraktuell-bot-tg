import request from 'request-promise-native';
import Markup from 'telegraf/markup';
import moment from 'moment';
import 'moment-timezone';

import urls from '../lib/urls';
import actionData from '../lib/actionData';
import { escapeHTML, trackLink } from '../lib/util';
import { byAGS } from '../data/locationMappings';

const imageVariants = [
    'ARDFotogalerie',
    'TeaserAufmacher',
    'original',
];

export const handleLocationRegions = async (ctx) => {
    const location = byAGS[ctx.data.ags];
    return handleNewsfeedStart(ctx, {
        tag: location.sophoraDistrictTag,
        location: location });
};

export const handleSophoraTag = async (ctx) => {
    if (ctx.dialogflowParams.sophoraTag.stringValue) {
        const tag = ctx.dialogflowParams.sophoraTag.stringValue;
        return handleNewsfeedStart(ctx, { tag } );
    }
    return handleNewsfeedStart(ctx, { tag: 'Schlagzeilen' });
};

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
    let imageUrl = 'https://images.informant.einslive.de/75788e87-9bae-44d5-998b-fb41ff3570d3.png';

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
            (candidate, i) => statuses[i].status === 'fulfilled' &&
            statuses[i].value['content-type'].startsWith('image')
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

    let introText = `Hier unser aktuellen Nachrichten zum Thema "${options.tag}":`;
    if ('location' in options) {
        introText = `Das ist gerade in der Region ${options.location.district} wichtig:`;
    } else if (options.tag === 'Schlagzeilen') {
        introText = 'Hier die neuesten Meldungen von WDR aktuell:';
    } else if (options.tag === 'Tagesschau') {
        introText = 'Hier die neuesten Meldungen der Tagesschau:';
    }

    await ctx.reply(introText);
    return ctx.replyWithPhoto(imageUrl, extra);
};

export const handleNewsfeedPage = async (ctx) => {
    const options = { tag: ctx.data.tag };
    const { imageUrl, extra } = await getNews(ctx.data.next, options);
    const media ={ type: 'photo', media: imageUrl, caption: extra.caption, 'parse_mode': 'HTML' };
    return ctx.editMessageMedia(media, extra);
};
