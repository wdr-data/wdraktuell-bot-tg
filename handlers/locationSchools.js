
import schoolsByAGS from '../data/schools';
import { escapeHTML, trackLink } from '../lib/util';

const perStudent = function(devicePer100) {
    const fuckingNumber = Number(devicePer100.replace(',', '.'));
    if (devicePer100 === '0') {
        return 'no device';
    }
    return Math.round(100/fuckingNumber, 1);
};

const extendSchoolData = function(schoolData) {
    schoolData.tablets = perStudent(schoolData['Tablets je 100 Schüler']);
    schoolData.laptops = perStudent(schoolData['Laptops je 100 Schüler']);
    schoolData.whiteboards = perStudent(schoolData['Whiteboards je 100 Schüler']);
    schoolData.desktops = perStudent(schoolData['Desktoprechner je 100 Schüler']);
    schoolData.numbers = schoolData.tablets ? true : false;
    schoolData.tabletsNRW = perStudent(schoolData['Mittelwert NRW Tablets']);
    schoolData.laptopsNRW = perStudent(schoolData['Mittelwert NRW Laptops']);
    schoolData.whiteboardsNRW = perStudent(schoolData['Mittelwert NRW Whiteboards']);
    schoolData.desktopsNRW = perStudent(schoolData['Mittelwert NRW Desktop']);
    return schoolData;
};

export const handleCity = async (ctx, city) => {
    const ags = city.keyCity;
    const schoolData = extendSchoolData(schoolsByAGS[ags]);
    console.log(ags);
    console.log(schoolData);

    const locationType = city.city ? 'city' : 'district';
    const locationName = city[locationType];

    if (!schoolData.responded) {
        return ctx.reply(`Für ${
            locationName
        } liegen keine Daten vor. ${locationName} hat unsere Anfrage nicht beantwortet.`);
    }
    /*
    const text = Object.entries(schoolData).map(
        ([ k, v ]) => `<b>${escapeHTML(k.toString())}:</b> ${escapeHTML(v.toString())}`
    ).join('\n');
    */
    const text = `An den Schulen in ${schoolData.Ort} teilen sich im Schnitt je 100 Schüler*innen`;

    let table = `${schoolData.Ort} hat zwar auf unsere Anfrage geantwortet, ` +
            `konnte uns aber keine Angaben zu der Anzahl technischer Endgeräten in Schulen geben.`;
    if (schoolData.numbers) {
        table = `Tablets: ${
            schoolData.tablets === 'no device' ? 'Keine Tablets vorhanden' :
                schoolData.tablets
        }\nLaptops: ${
            schoolData.laptops === 'no device' ? 'Keine Laptops vorhanden' :
                schoolData.laptops
        }\nDesktoprechner: ${
            schoolData.desktops === 'no device' ? 'Keine Desktoprechner vorhanden' :
                schoolData.desktops
        }\nWhiteboards: ${
            schoolData.whiteboards === 'no device' ? 'Keine Whiteboards vorhanden' :
                schoolData.whiteboards
        }\n`;
    }
    let range = '';
    switch (schoolData['SCORE GESAMT']) {
    case '0':
        range = 'unterhalb des';
        break;
    case '2':
        range = 'unterhalb des';
        break;
    case '4':
        range = 'im';
        break;
    case '6':
        range = 'über dem';
        break;
    case '8':
        range = 'über dem';
        break;
    case '12':
        range = false;
        break;
    case '15':
        range = false;
        break;
    }

    let middleText = '';
    if (range) {
        middleText = `In unserem NRW-Vergleich liegt ${
            schoolData.Ort
        } damit ${range} Durchschnitt.\n\n`;
    }

    const finalText = `Für die Befragung haben wir alle 396 Kommunen in NRW anschrieben. ` +
        `309 von Ihnen haben uns geantwortet.`;


    const ddjUrl = trackLink(
        'https://www1.wdr.de/nachrichten/themen/coronavirus/corona-daten-nrw-100.html', {
            campaignType: 'unterhaltung',
            campaignName: `Zahlen Digitalisierung Schulen`,
            campaignId: 'spezial',
        });
    const ddjLink = `\n🔗 <a href="${escapeHTML(ddjUrl)}">${
        escapeHTML(`Weitere Ergebnisse und interaktive Grafiken`)
    }</a>`;

    ctx.reply(
        `${text}\n\n${table}\n\n${middleText}${finalText}\n${ddjLink}`,
        {
            'parse_mode': 'HTML',
            'disable_web_page_preview': true,
        }
    );
};
