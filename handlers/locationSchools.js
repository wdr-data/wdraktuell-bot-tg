
import schoolsByAGS from '../data/schools';
import { escapeHTML, trackLink } from '../lib/util';

export const generateImageUrl = (ags) => `${process.env.MEDIA_BASE_URL}assets/schools/${ags}.png`;

export const handleLocation = async (ctx) => {
    return handleAGS(ctx, ctx.data.ags);
};

export const handleAGS = async (ctx, ags) => {
    const schoolData = schoolsByAGS[ags];
    const schoolDataNRW = schoolsByAGS['nrw'];
    console.log(ags);
    console.log(schoolData);

    let intro = `${
        schoolData.name
    } hat als eine von 87 Kommunen nicht auf unsere IFG-Anfrage geantwortet.`;
    let device = `Leider hat ${
        schoolData.name
    } keine Angaben zu digitalen Geräten an den Schulen gemacht.`;
    let fiber = '';

    if (schoolData.responded) {
        intro = `In ${
            schoolData.name
        } gehen ${
            schoolData.numStudentsTotal
        } Schüler*innen auf ${
            schoolData.numSchoolsTotal === 1 ?
                `eine Schule` : `${schoolData.numSchoolsTotal} Schulen`
        }.`;

        const noDevice = [];
        if (schoolData.answeredDevices) {
            device = `An den Schulen teilen sich im Schnitt\n${
                schoolData.studentsPerLaptop ? `${
                    schoolData.studentsPerLaptop
                } Schüler*innen einen Laptop,\n` : ''
            }${
                schoolData.studentsPerTablet? `${
                    schoolData.studentsPerTablet
                } Schüler*innen ein Tablet,\n` : ''
            }${
                schoolData.studentsPerDesktop ? `${
                    schoolData.studentsPerDesktop
                } Schüler*innen einen Desktoprechner,\n` : ''
            }${
                schoolData.studentsPerWhiteboard ? `${
                    schoolData.studentsPerWhiteboard
                } Schüler*innen ein Whiteboard.\n` : ''
            }`;
            for (const [ key, value ] of Object.entries({
                'studentsPerLaptop': 'Laptops',
                'studentsPerTablet': 'Tablets',
                'studentsPerDesktop': 'Desktoprechner',
                'studentsPerWhiteboard': 'Whiteboards',
            })) {
                if (!schoolData[key]) {
                    noDevice.push(value);
                }
            }
            if (noDevice) {
                device += '\n' + noDevice.join(', ') + ' sind keine vorhanden.';
            }
        }
        device += `\n\nIm Vergleich dazu teilen sich in ganz NRW im Schnitt\n${
            schoolDataNRW.studentsPerLaptop
        } Schüler*innen einen Laptop,\n${
            schoolDataNRW.studentsPerTablet
        } Schüler*innen ein Tablet,\n${
            schoolDataNRW.studentsPerDesktop
        } Schüler*innen einen Desktoprechner,\n${
            schoolDataNRW.studentsPerWhiteboard
        } Schüler*innen ein Whiteboard.\n`;

        if ( schoolData.couldEvaluateFiber ) {
            fiber = `${
                schoolData.numSchoolsFiber
            } / ${
                schoolData.numSchoolsTotal
            } Schulen haben einen Glasfaser Anschluss (> 100 MBit/s).`;
        } else if (schoolData.answeredFiber) {
            fiber = `Leider konnte die Antwort von ${schoolData.name} nicht ausgewertet werden.`;
        }
    }

    const outro = `Für die Daten hat das WDR Newsroom-Team ` +
        `alle 396 Kommunen in NRW im Juli 2020 per IFG angefragt.`;

    const ddjUrl = trackLink(
        'https://www1.wdr.de/nachrichten/digitalisierung-schulen-umfrage-kommunen-100.html', {
            campaignType: 'unterhaltung',
            campaignName: `Zahlen Digitalisierung Schulen`,
            campaignId: 'feature',
        });
    const ddjLink = `\n<a href="${escapeHTML(ddjUrl)}">🔗 ${
        escapeHTML(`Weitere Ergebnisse und interaktive Grafiken`)
    }</a>`;

    const caption = `${intro}\n\n${device}\n${fiber}\n${outro}\n${ddjLink}`;

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
