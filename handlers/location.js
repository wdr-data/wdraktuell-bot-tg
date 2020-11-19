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
        } liegt wohl nicht in NRW. Versuche es mit einer PLZ oder einem Ort aus NRW.`);
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

    const buttonSchool = Markup.callbackButton(
        'Schulumfrage',
        actionData('location_school', {
            ags: location.keyCity,
            track: {
                category: 'Feature',
                event: 'Location',
                label: 'Choose',
                subType: 'Schulumfrage',
            },
        }),
    );

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

    const buttons = [
        buttonCorona,
        buttonRegion,
        buttonSchool,
    ];
    const extra = {};
    extra['reply_markup'] = Markup.inlineKeyboard(buttons.map((button) => [ button ]));

    await ctx.reply(messageText, extra);
};
