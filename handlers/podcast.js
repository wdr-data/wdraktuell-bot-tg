import request from 'request-promise-native';
import Markup from 'telegraf/markup';
import moment from 'moment';
import 'moment-timezone';

import urls from '../lib/urls';
import DynamoDbCrud from '../lib/dynamodbCrud';
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

    const attachments = new DynamoDbCrud(process.env.DYNAMODB_ATTACHMENTS, 'url');
    const item = await attachments.load(podcastUrl);

    const buttonPicker = [];
    if (options.show === '0630_by_WDR_aktuell_WDR_Online') {
        buttonPicker.push(Markup.urlButton(
            item ? `Podcast 0630 abonnieren` : `Podcast 0630 hören`,
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

    if (!item) {
        const text = `<b>${escapeHTML(episode.title)}</b>\n\n${escapeHTML(teaserText)}`;
        return ctx.reply(text, extra);
    }

    return ctx.replyWithAudio(item.attachment_id, extra);
};
