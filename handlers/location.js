import moment from 'moment-timezone';
import Markup from 'telegraf/markup';
import actionData from '../lib/actionData';

import { byCities, byZipCodes } from '../data/locationMappings';
import { handleCity as handleCityCorona } from './locationCorona';
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

    const location = byCities[locationName];

    // If we didn't find the city, inform user about most likely cause if possible
    if (!location && (locationName || zipCode)) {
        return ctx.reply(`${
            zipCode ? `Die Postleitzahl ${zipCode}` : locationName
        } erkennt unser System nicht.
Versuche es mal mit dem Namen deines Ortes oder mit einer anderen PLZ.
Den Service bieten wir außerdem nur für Orte in NRW.`);
    } else if (!(locationName || zipCode)) {
        return ctx.reply(ctx.dialogflowResponse);
    }

    // Trigger specific location feature
    if (options.type === 'corona') {
        return handleCityCorona(ctx, location);
    } else if (options.type === 'schools') {
        return handleAGSSchools(ctx, location.keyCity);
    } else if (options.type === 'regions' ) {
        return handleNewsfeedStart(ctx, { tag: location.sophoraDistrictTag, location: location });
    } else {
        return chooseLocation(ctx, location);
    }
};

const chooseLocation = async (ctx, location) => {
    const messageText = 'Was interessiert dich?';

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

    let buttonText = 'Regionale News';
    if (moment.now() - moment('2020-11-21')< 7*24*60*60*1000) {
        buttonText = '✨Neu✨ ' + buttonText;
    }
    const buttonRegion= Markup.callbackButton(
        buttonText,
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

    const buttons = [
        buttonCorona,
        buttonRegion,
    ];
    const extra = {};
    extra['reply_markup'] = Markup.inlineKeyboard(buttons.map((button) => [ button ]));

    await ctx.reply(messageText, extra);
};
