import { byCities, byStudios, byZipCode } from '../data/locationMappings';

export const handleLocation = async (ctx) => {
    const location = ctx.dialogflowParams.location.structValue.fields;

    let messageText = ctx.dialogflowResponse;
    if (location.city.stringValue) {
        console.log(`Detected city: ${location.city.stringValue}`);
        return handleCity(ctx, location.city.stringValue);
    } else if (location['zip-code'].stringValue) {
        const queryZipCode = location['zip-code'].stringValue;
        console.log(`Detected zip-code: ${location['zip-code'].stringValue}`);
        console.log(byZipCode);
        console.log(byZipCode[queryZipCode]);
        if (byZipCode[queryZipCode]) {
            return handleCity(ctx, byZipCode[queryZipCode].city);
        }
    }

    await ctx.reply(messageText);
};

export const handleCity = async (ctx, queryCity) => {
    if (byCities[queryCity]) {
        const city = byCities[queryCity];

        await ctx.reply(
            `Das zu ${city.city} gehörige Studio ist ${city.studio} (${city.region})`
        );
        return ctx.reply(`Hier findest du Infos über Corona in deiner Region\n ${
            byStudios[city.studio].linkCorona
        } aus unserem WDR Studio.`);
    }

    return ctx.reply(`${
        queryCity
    } liegt wohl nicht in NRW. Versuche es mit einem Ort oder einer Stadt aus NRW.`);
};
