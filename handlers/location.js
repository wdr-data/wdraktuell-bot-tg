import { byCities, byStudios, byZipCodes } from '../data/locationMappings';
import { escapeHTML, trackLink } from '../lib/util';
import getFaq from '../lib/faq';

import request from 'request-promise-native';
import csvtojson from 'csvtojson';

const uri = 'https://covid19nrw.netlify.com/.netlify/functions/get_nrw';

export const handleLocation = async (ctx) => {
    const location = ctx.dialogflowParams.location.structValue.fields;
    console.log(`Detected location: ${location}`);
    let messageText = ctx.dialogflowResponse;
    const zipCode = location['zip-code'].stringValue;
    let city = location.city.stringValue;
    console.log(`zipCode: ${zipCode}`);
    console.log(`city: ${zipCode}`);
    if (byZipCodes[zipCode]) {
        city = byZipCodes[zipCode].city;
    }
    if (city) {
        ctx.track({
            category: 'Unterhaltung',
            event: 'Feature',
            label: 'Location',
            subType: byCities[city] ? `${city}-NRW` : city,
        });
    }
    if (byCities[city]) {
        return handleCity(ctx, byCities[city]);
    }
    if (city || zipCode) {
        return ctx.reply(`${
            zipCode ? `Die Postleitzahl ${zipCode}` : city
        } liegt wohl nicht in NRW. Versuche es mit einer PLZ, einem Ort oder einer Stadt aus NRW.`);
    }
    return ctx.reply(messageText);
};

export const handleCity = async (ctx, cityFull) => {
    const covidText = await getFaq(`locationcovidnrw`);

    const covidData = await getCovid(cityFull.district);

    const studioUrl = trackLink(byStudios[cityFull.studio].linkCorona, {
        campaignType: 'unterhaltung',
        campaignName: `Corona Info Studio ${cityFull.studio}`,
        campaignId: 'covid',
    });
    const studioLink = `\n🔗 <a href="${escapeHTML(studioUrl)}">${
        escapeHTML(`Coronavirus in NRW - Studio ${cityFull.studio}`)
    }</a>`;

    const ddjUrl = trackLink(
        'https://www1.wdr.de/nachrichten/themen/coronavirus/corona-daten-nrw-100.html', {
            campaignType: 'unterhaltung',
            campaignName: `Zahlen Corona-Krise NRW`,
            campaignId: 'covid',
        });
    const ddjLink = `\n🔗 <a href="${escapeHTML(ddjUrl)}">${
        escapeHTML(`Aktuelle Zahlen zur Corona-Krise in NRW`)
    }</a>`;

    const messageText = `Hier die aktuellen Zahlen für ${
        cityFull.keyCity.slice(-1) === '0' ? cityFull.city : 'den Landkreis ' + cityFull.district
    }:\n${covidData.infected} positiv auf das Coronavirus getestete Menschen. Das entspricht ${
        covidData.per100k
    } Menschen pro 100.000 Einwohner.  An der Krankheit Covid-19 sind ${
        cityFull.keyCity.slice(-1) === '0' ?
            `in ${cityFull.city}` : 'im Landkreis ' +
            cityFull.district
    } bisher ${
        covidData.dead
    } Menschen gestorben.\n\nMit ${
        covidData.max.per100k
    } wurden die meisten positiven Tests pro 100.000 Einwohner (${
        covidData.max.dead
    } Tote) in ${
        covidData.max.district
    } registriert.\nDie wenigsten positiven Tests wurden hier gezählt: ${
        covidData.min.district
    } mit ${
        covidData.min.per100k
    } Infizierten pro 100.000 Einwohner (${
        covidData.min.dead
    } Tote).\n\n(Stand: ${
        covidData.publishedDate
    })\n\n`;

    return ctx.reply(
        escapeHTML(messageText) + `${escapeHTML(covidText.text)}\n${ddjLink}\n${studioLink}`,
        {
            'parse_mode': 'HTML',
            'disable_web_page_preview': true,
        }
    );
};

export const getCovid = async (district) => {
    const response = await request.get({ uri });
    console.log(response);
    const covidData = await csvtojson({ flatKeys: true }).fromString(response);
    console.log(covidData);

    const sorted = covidData.sort(
        (a, b) => a['Infizierte pro 100.000 Einwohner'] - b['Infizierte pro 100.000 Einwohner']
    );
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    for (const row of covidData) {
        if (row['Landkreis/ kreisfreie Stadt'] === district) {
            return {
                infected: row['Infizierte'],
                per100k: row['Infizierte pro 100.000 Einwohner'].split('.')[0],
                dead: row['Tote'] || '0',
                publishedDate: row['Stand'],
                max: {
                    district: max['Landkreis/ kreisfreie Stadt'],
                    infected: max['Infizierte'],
                    dead: max['Tote'] || '0',
                    per100k: max['Infizierte pro 100.000 Einwohner'].split('.')[0],
                },
                min: {
                    district: min['Landkreis/ kreisfreie Stadt'],
                    infected: min['Infizierte'],
                    dead: min['Tote'] || '0',
                    per100k: min['Infizierte pro 100.000 Einwohner'].split('.')[0],
                },
            };
        }
    }
    return;
};
