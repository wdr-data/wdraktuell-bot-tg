import request from 'request-promise-native';
import Markup from 'telegraf/markup';
import moment from 'moment';
import 'moment-timezone';

import urls from '../lib/urls';
import { trackLink } from '../lib/util';

/*
import actionData from '../lib/actionData';
import { escapeHTML, trackLink } from '../lib/util';

const imageVariants = [
    'ARDFotogalerie',
    'gseapremiumxl',
    'TeaserAufmacher',
];
*/
export const handlePodcast = async (
    ctx,
    options = { show: '0630_by_WDR_aktuell_WDR_Online' }
) => {
    const response = await request({
        uri: urls.documentsByShow(1, 1, options.show),
        json: true,
    });
    const episode = response.data[0];
    console.log(episode);

    const title = episode.programme.title;
    const teasterText = episode.teaserText;
    const podcastUrl = episode.podcastUrl;
    const date = moment(
        episode.broadcastTime
    ).tz('Europe/Berlin').format('DD.MM.YY');

    const buttonPicker = [];
    if (options.show === '0630_by_WDR_aktuell_WDR_Online') {
        buttonPicker.push(Markup.urlButton(
            `Podcast 0630 abonnieren`,
            trackLink('https://www1.wdr.de/0630', {
                campaignType: 'podcast-feature',
                campaignName: `0630-button`,
                campaignId: '',
            })
        ));
    }

    const extra = Markup.inlineKeyboard( buttonPicker ).extra({
        caption: `${teasterText}`,
        title: `${title} vom ${date}`,
    });

    return ctx.replyWithAudio(podcastUrl, extra);
};
