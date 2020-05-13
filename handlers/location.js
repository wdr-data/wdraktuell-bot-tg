import { byCities, byStudios, byZipCodes } from '../data/locationMappings';
import { escapeHTML, trackLink } from '../lib/util';
import getFaq from '../lib/faq';

import request from 'request-promise-native';
import csvtojson from 'csvtojson';

const uriCityMAGS = 'https://coronanrw-prod.s3.eu-central-1.amazonaws.com/corona_mags_nrw.csv';
const uriNRWMAGS = 'https://coronanrw-staging.s3.eu-central-1.amazonaws.com/corona_mags_nrw_gesamt.csv';

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

    const covidDataCity = await getCovidCityMAGS(cityFull.district);
    const covidDataNRW = await getCovidNRWMAGS();

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

    let indicator = '';
    if (covidDataCity.lastSevenDaysPer100k >= 50) {
        indicator = '🟥';
    } else if (covidDataCity.lastSevenDaysPer100k >= 25) {
        indicator = '🟧';
    } else if (covidDataCity.lastSevenDaysPer100k > 10) {
        indicator = '🟨';
    }

    /* eslint-disable */
    const messageText = `Hier die aktuellen Corona-Fallzahlen für ${
        cityFull.keyCity.slice(-3) === '000' ? cityFull.city : 'den Landkreis ' + cityFull.district
    }:\n\nGemeldete Infektionen in den vergangenen 7 Tagen pro 100.000 Einwohner: ${
        covidDataCity.lastSevenDaysPer100k
    } ${
        indicator
    }\nGemeldete Infektionen in den vergangenen 7 Tagen: ${
        covidDataCity.lastSevenDaysNew
    }\nBestätigte Infektionen seit Beginn: ${
        covidDataCity.infected
    }\nGenesene: ${
        covidDataCity.recovered
    }\nTodesfälle: ${
        covidDataCity.dead
    }\n\nSteigt die Zahl der Neuinfektionen in den vergangenen 7 Tagen pro 100.000 Einwohner über 50, dann muss die Stadt ${
        cityFull.keyCity.slice(-3) === '000' ? cityFull.city : 'der Landkreis ' + cityFull.district
    } Maßnahmen zur Eindämmung ergreifen.\n
Aktuelle Zahlen für NRW im Überblick:\nGemeldete Infektionen in den vergangenen 7 Tagen pro 100.000 Einwohner: ${
        covidDataNRW.lastSevenDaysPer100k
    }\nGemeldete Infektionen in den vergangenen 7 Tagen: ${
        covidDataNRW.lastSevenDaysNew
    }\nBestätigte Infektionen: ${
        covidDataNRW.infected
    }\nGenesene: ${
        covidDataNRW.recovered
    }\nTodesfälle: ${
        covidDataNRW.dead
    }\n\n(Quelle: MAGS NRW, Stand: ${
        covidDataCity.publishedDate
    })\n\n`;

    return ctx.reply(
        escapeHTML(messageText) + `${escapeHTML(covidText.text)}\n${ddjLink}\n${studioLink}`,
        {
            'parse_mode': 'HTML',
            'disable_web_page_preview': true,
        }
    );
};

export const getCovidCityMAGS = async (district) => {
    const response = await request.get({ uri: uriCityMAGS });
    const covidData = await csvtojson({ flatKeys: true }).fromString(response);

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
                lastSevenDaysNew: row['Neuinfektionen vergangene 7 Tage'],
                lastSevenDaysPer100k: row['7-Tage-Inzidenz'],
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

export const getCovidNRWMAGS = async () => {
    const response = await request.get({ uri: uriNRWMAGS });
    console.log(response);
    const covidData = await csvtojson({ flatKeys: true }).fromString(response);
    console.log(covidData);
    const total = covidData[0];
    return {
        infected: total['Infizierte'],
        per100k: total['Infizierte pro 100.000'].split('.')[0],
        dead: total['Todesfälle'] || '0',
        publishedDate: total['Stand'],
        recovered: total['Genesene*'],
        lastSevenDaysNew: total['Neuinfektionen vergangene 7 Tage'],
        lastSevenDaysPer100k: total['7-Tage-Inzidenz'],
    };
};
