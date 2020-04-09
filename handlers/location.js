import { byCities, byStudios, byZipCodes } from '../data/locationMappings';
import { escapeHTML, trackLink } from '../lib/util';
import getFaq from '../lib/faq';

import request from 'request-promise-native';
import csvtojson from 'csvtojson';

const uri = 'https://coronanrw-prod.s3.eu-central-1.amazonaws.com/corona_mags_nrw.csv';

export const handleLocation = async (ctx) => {
    if (!ctx.dialogflowParams.location.structValue) {
        return ctx.reply(ctx.dialogflowResponse);
    }
    const location = ctx.dialogflowParams.location.structValue.fields;
    console.log(`Detected location: ${location}`);
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
            subType: byCities[city] ? city : `${city}-0`,
        });
    }
    if (byCities[city]) {
        return handleCity(ctx, byCities[city]);
    }
    if (city || zipCode) {
        return ctx.reply(`${
            zipCode ? `Die Postleitzahl ${zipCode}` : city
        } liegt wohl nicht in NRW. Versuche es mit einer PLZ oder einem Ort aus NRW.`);
    }
    return ctx.reply(ctx.dialogflowResponse);
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

    const messageText = `Hier die aktuellen Corona-Fallzahlen für ${
        cityFull.keyCity.slice(-3) === '000' ? cityFull.city : 'den Landkreis ' + cityFull.district
    }:\n${
        covidData.infected
    } - Bestätigte Infektionen\n${
        covidData.recovered
    } - Genesene\n${
        covidData.dead} - Todesfälle\n${
        covidData.per100k
    } - Infektionen je 100.000 Einwohner\n\nDie meisten bestätigten Infizierten gibt es hier: ${
        covidData.max.district
    }\n${
        covidData.max.infected
    } - Bestätigte Infektionen\n${
        covidData.max.recovered
    } - Genesene\n${
        covidData.max.dead} - Todesfälle\n${
        covidData.max.per100k
    } - Infektionen je 100.000 Einwohner\n\nDie wenigsten Infizierten gibt es hier: ${
        covidData.min.district
    }\n${
        covidData.min.infected
    } - Bestätigte Infektionen\n${
        covidData.min.recovered
    } - Genesene\n${
        covidData.min.dead} - Todesfälle\n${
        covidData.min.per100k
    } - Infektionen je 100.000 Einwohner\n\n(Quelle: MAGS NRW, Stand: ${
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
        (a, b) => a['Infizierte'] - b['Infizierte']
    );
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    for (const row of covidData) {
        if (row['Landkreis/ kreisfreie Stadt'] === district) {
            return {
                infected: row['Infizierte'],
                per100k: row['Infizierte pro 100.000'].split('.')[0],
                dead: row['Todesfälle'] || '0',
                publishedDate: row['Stand'],
                recovered: row['Genesene*'],
                max: {
                    district: max['Landkreis/ kreisfreie Stadt'],
                    infected: max['Infizierte'],
                    dead: max['Todesfälle'] || '0',
                    per100k: max['Infizierte pro 100.000'].split('.')[0],
                    recovered: max['Genesene*'],
                },
                min: {
                    district: min['Landkreis/ kreisfreie Stadt'],
                    infected: min['Infizierte'],
                    dead: min['Todesfälle'] || '0',
                    per100k: min['Infizierte pro 100.000'].split('.')[0],
                    recovered: min['Genesene*'],
                },
            };
        }
    }
    return;
};
