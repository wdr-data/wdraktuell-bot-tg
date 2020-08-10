
import schoolsByAGS from '../data/schools';
import { escapeHTML, trackLink } from '../lib/util';

export const generateImageUrl = (ags) => `${process.env.MEDIA_BASE_URL}assets/schools/${ags}.png`;

export const handleLocation = async (ctx) => {
    return handleAGS(ctx, ctx.data.ags);
};

export const handleAGS = async (ctx, ags) => {
    const schoolData = schoolsByAGS[ags];
    console.log(ags);
    console.log(schoolData);

    if (!schoolData.responded) {
        return ctx.reply(`Für ${
            schoolData.name
        } liegen keine Daten vor. ${schoolData.name} hat unsere Anfrage nicht beantwortet.`);
    }

    const text = `An den Schulen in ${schoolData.name} teilen sich im Schnitt je 100 Schüler*innen`;

    let table = `${schoolData.name} hat zwar auf unsere Anfrage geantwortet, ` +
            `konnte uns aber keine Angaben zu der Anzahl technischer Endgeräten in Schulen geben.`;
    if (schoolData.answeredDevices) {
        table = `Tablets: ${
            schoolData.studentsPerTablet ?
                schoolData.studentsPerTablet : 'Keine Tablets vorhanden'
        }\nLaptops: ${
            schoolData.studentsPerLaptop ?
                schoolData.studentsPerLaptop : 'Keine Laptops vorhanden'
        }\nDesktoprechner: ${
            schoolData.studentsPerDesktop ?
                schoolData.studentsPerDesktop : 'Keine Desktoprechner vorhanden'
        }\nWhiteboards: ${
            schoolData.studentsPerWhiteboard ?
                schoolData.studentsPerWhiteboard : 'Keine Whiteboards vorhanden'
        }\n`;
    }


    const finalText = `Für die Befragung haben wir alle 396 Kommunen in NRW anschrieben. ` +
        `309 von ihnen haben uns geantwortet.`;


    const ddjUrl = trackLink(
        'https://www1.wdr.de/nachrichten/themen/coronavirus/corona-daten-nrw-100.html', {
            campaignType: 'unterhaltung',
            campaignName: `Zahlen Digitalisierung Schulen`,
            campaignId: 'spezial',
        });
    const ddjLink = `\n<a href="${escapeHTML(ddjUrl)}">🔗 ${
        escapeHTML(`Weitere Ergebnisse und interaktive Grafiken`)
    }</a>`;

    const caption = `${text}\n\n${table}\n\n${finalText}\n${ddjLink}`;

    /*
    const caption = Object.entries(schoolData).map(
        ([ k, v ]) => `<b>${escapeHTML(k.toString())}:</b> ${escapeHTML(v.toString())}`
    ).join('\n');
    */

    const imageUrl = generateImageUrl(ags);

    return ctx.replyWithAttachment(
        imageUrl,
        {
            caption,
            'parse_mode': 'HTML',
            'disable_web_page_preview': true,
        }
    );
};
