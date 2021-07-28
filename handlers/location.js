import moment from 'moment-timezone';
import Markup from 'telegraf/markup';
import actionData from '../lib/actionData';

import { byCities, byZipCodes } from '../data/locationMappings';
import { handleCity as handleCityCorona } from './locationCorona';
import { handleCity as handleCityWeather } from './locationWeather';
import { handleAGS as handleAGSSchools } from './locationSchools';
import { handleNewsfeedStart } from './newsfeed';


export const handleDialogflowLocation = async (ctx, options = {}) => {
    if (!ctx.dialogflowParams.location.structValue) {
        return ctx.reply(ctx.dialogflowResponse);
    }

    const locationDialogflow = ctx.dialogflowParams.location.structValue.fields;

    console.log(`Detected location:`, locationDialogflow);

    const zipCode = locationDialogflow['zip-code'].stringValue;

    // locationDialogflow to city name
    let locationName = locationDialogflow.city.stringValue;
    if (byZipCodes[zipCode]) {
        locationName = byZipCodes[zipCode].city;
    }

    const location = { ...byCities[locationName], zipCode: zipCode || undefined };

    // If we didn't find the city, inform user about most likely cause if possible
    if (!location && (locationName || zipCode)) {
        return ctx.reply(`${
            zipCode ? `Zur Postleitzahl ${zipCode}` : `Zu ${locationName}`
        } liegen uns leider keine Daten vor.
Versuche es mal mit dem Namen deines Ortes oder mit einer anderen PLZ.
Den Service bieten wir außerdem nur für Orte in NRW.

Die Kolleg:innen von der Tagesschau bieten einen Bot mit bundesweiter PLZ-Abfrage an:
https://t.me/ARD_tagesschau_Bot`);
    } else if (!(locationName || zipCode)) {
        return ctx.reply(ctx.dialogflowResponse);
    }

    // Trigger specific location feature
    if (options.type === 'corona') {
        return handleCityCorona(ctx, location);
    } else if (options.type === 'weather') {
        return handleCityWeather(ctx, location);
    } else if (options.type === 'schools') {
        return handleAGSSchools(ctx, location.keyCity);
    } else if (options.type === 'regions' ) {
        return handleNewsfeedStart(ctx, { tag: location.sophoraDistrictTag, location: location });
    } else if (options.type === 'candidates') {
        return handleLocationCandidates(ctx, location);
    } else {
        return chooseLocation(ctx, location);
    }
};

const chooseLocation = async (ctx, location) => {
    const messageText = 'Was interessiert dich?';

    // Corona
    const buttonCorona= Markup.callbackButton(
        'Corona-Fallzahlen',
        actionData('location_corona', {
            ags: location.keyCity,
            track: {
                category: 'Feature',
                event: 'Location',
                label: 'Choose',
                subType: 'Corona-Fallzahlen',
            },
        }),
    );

    // Regional news
    const buttonRegion= Markup.callbackButton(
        'Regionale News',
        actionData('location_region', {
            ags: location.keyCity,
            track: {
                category: 'Feature',
                event: 'Location',
                label: 'Choose',
                subType: 'Regionale News',
            },
        }),
    );

    // Weather
    const buttonWeather = Markup.callbackButton(
        'Wetter',
        actionData('location_weather', {
            ags: location.keyCity,
            track: {
                category: 'Feature',
                event: 'Location',
                label: 'Choose',
                subType: 'Wetter',
            },
        }),
    );

    const buttons = [
        buttonCorona,
        buttonRegion,
        buttonWeather,
    ];
    const extra = {};
    extra['reply_markup'] = Markup.inlineKeyboard(buttons.map((button) => [ button ]));

    await ctx.reply(messageText, extra);
};
