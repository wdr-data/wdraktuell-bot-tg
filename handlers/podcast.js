import request from 'request-promise-native';
import Markup from 'telegraf/markup';
import moment from 'moment';
import 'moment-timezone';

import urls from '../lib/urls';
import { trackLink, escapeHTML } from '../lib/util';


export const handlePodcast = async (
    ctx,
    options = { show: '0630_by_WDR_aktuell_WDR_Online' }
) => {
    const response = await request({
        uri: urls.documentsByShow(1, 1, options.show),
        json: true,
    });
    const episode = response.data[0];

    const title = episode.programme.title;
    const teaserText = episode.teaserText.join('\n').slice(0, 800);
    const podcastUrl = episode.podcastUrl;
    const date = moment(
        episode.broadcastTime
    ).tz('Europe/Berlin').format('DD.MM.YY');

    // Temp fix: Check if file is bigger than upload limit
    const headers = await request.head(podcastUrl);
    const largeFile = headers['content-length'] > 20000000;

    const buttonPicker = [];
    if (options.show === '0630_by_WDR_aktuell_WDR_Online') {
        buttonPicker.push(Markup.urlButton(
            largeFile ? `Podcast 0630 hören` : `Podcast 0630 abonnieren`,
            trackLink('https://www1.wdr.de/0630', {
                campaignType: 'podcast-feature',
                campaignName: `0630-button`,
                campaignId: '',
            })
        ));
    }

    const extra = Markup.inlineKeyboard( buttonPicker ).extra({
        caption: `<b>${escapeHTML(episode.title)}</b>\n\n${escapeHTML(teaserText)}`,
        title: `${title} vom ${date}`,
        'parse_mode': 'HTML',
    });

    if (largeFile) {
        const text = `<b>${escapeHTML(episode.title)}</b>\n\n${escapeHTML(teaserText)}`;
        return ctx.reply(text, extra);
    }

    return ctx.replyWithAttachment(podcastUrl, extra);
};
