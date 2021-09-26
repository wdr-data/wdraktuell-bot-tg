import Markup from 'telegraf/markup';
import actionData from '../lib/actionData';
import moment from 'moment-timezone';

import { handleFaq } from './faq';
import { byAGS } from '../data/locationMappings';
import wahlkreisById from '../data/wahlkreisById';
import wahlkreiseByCity from '../data/wahlkreiseByCity';
import wahlkreiseByZip from '../data/wahlkreiseByZip';

export const handleLocation = async (ctx) => {
    const location = byAGS[ctx.data.ags];
    location.zipCode = ctx.data.zip;

    return handleCity(ctx, location);
};

export const handleCity = async (ctx, location) => {
    if (moment() - moment('2021-09-26T18:00:00+02:00') > 0 ) {
        ctx['data'] = { faq: 'election' };
        return handleFaq(ctx);
    }

    let wahlkreisIds;

    if (location.zipCode) {
        wahlkreisIds = wahlkreiseByZip[location.zipCode].wahlkreise;
    } else {
        wahlkreisIds = wahlkreiseByCity[location.keyCity].wahlkreise;
    }

    const wahlkreise = wahlkreisIds.map((wahlkreisId) => wahlkreisById[wahlkreisId]);

    if (wahlkreise.length === 1) {
        return handleWahlkreis_(ctx, wahlkreise[0].id);
    } else if (wahlkreise.length === 0) {
        throw new Error('No wahlkreis found');
    }

    const buttons = wahlkreise.map((wahlkreis) =>
        Markup.callbackButton(
            wahlkreis.wahlkreisName,
            actionData('location_candidates_wk', {
                wahlkreis: wahlkreis.id,
                track: {
                    category: 'Feature',
                    event: 'Kandidatencheck',
                    label: 'Choose-Wahlkreis',
                    subType: wahlkreis.name,
                },
            }),
        )
    );

    const extra = {};
    extra['reply_markup'] = Markup.inlineKeyboard(buttons.map((button) => [ button ]));

    const messageText = `Wähle deinen Wahlkreis:`;
    return ctx.reply(messageText, extra);
};


export const handleWahlkreis = async (ctx) => {
    return handleWahlkreis_(ctx, ctx.data.wahlkreis);
};


const handleWahlkreis_ = async (ctx, wahlkreisId) => {
    const wahlkreis = wahlkreisById[wahlkreisId];

    ctx.track({
        category: 'Feature',
        event: 'Location',
        label: 'Kandidatencheck',
        subType: wahlkreis.wahlkreisName,
    });

    const candidates = wahlkreis.kandidaten.map((c) => {
        return `  • ${c.vorname} ${c.nachname}, ${c.partei}`;
    });

    const moreUrl = `https://www1.wdr.de/kandidatencheck/2021/wdr-bundestagswahl/app/kandidatencheck144.html?wahlkreisid=${wahlkreis.id}&wt_mc=tg`;

    const text = `In deinem Wahlkreis „${
        wahlkreis.wahlkreisName
    }“ stellen sich diese Direkt-Kandidat:innen zur Wahl:\n\n${
        candidates.join('\n')
    }\n\nHier beantworten Kandidat:innen in Drei-Minuten-Videos Fragen zu Wahlkampf-Themen:\n${
        moreUrl
    }`;

    const imageUrl = 'https://images.informant.einslive.de/MicrosoftTeams-image-0fd5c975-6c55-4f78-a49d-4cdd6bc4109b.png';

    return ctx.replyWithPhoto(imageUrl, {
        'caption': text,
        'disable_web_page_preview': true,
    });
};
