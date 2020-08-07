import { byCities, byZipCodes } from '../data/locationMappings';
import { handleCity as handleCityCorona } from './locationCorona';
import { handleCity as handleCitySchools } from './locationSchools';


export const handleLocation = async (ctx, options = {}) => {
    if (!ctx.dialogflowParams.location.structValue) {
        return ctx.reply(ctx.dialogflowResponse);
    }

    const locationDialogflow = ctx.dialogflowParams.location.structValue.fields;

    console.log(`Detected location:`, locationDialogflow);

    const zipCode = locationDialogflow['zip-code'].stringValue;
    const subadminArea = locationDialogflow['subadmin-area'].stringValue;

    // Find city name
    let locationName = locationDialogflow.city.stringValue;
    if (subadminArea) {
        locationName = subadminArea;
    }
    if (byZipCodes[zipCode]) {
        locationName = byZipCodes[zipCode].city;
    }

    const location = byCities[locationName];

    // Track city if found
    if (location) {
        // TODO: Track options.type
        ctx.track({
            category: 'Feature',
            event: 'Location',
            label: zipCode ? 'Postleitzahl' : 'Ort',
            subType: location,
        });
    }

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
        return handleCitySchools(ctx, location);
    } else {
        return ctx.reply(ctx.dialogflowResponse);
    }
};
