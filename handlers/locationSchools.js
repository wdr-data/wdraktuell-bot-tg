
import schoolsByAGS from '../data/schools';
import { escapeHTML } from '../lib/util';


export const handleCity = async (ctx, city) => {
    const ags = city.keyCity;
    const schoolData = schoolsByAGS[ags];
    console.log(ags);
    console.log(schoolData);

    const locationType = city.city ? 'city' : 'district';
    const locationName = city[locationType];

    if (!schoolData.responded) {
        return ctx.reply(`${locationName} hat uns leider keine Daten zur Verfügung gestellt.`);
    }

    const text = Object.entries(schoolData).map(
        ([ k, v ]) => `<b>${escapeHTML(k.toString())}:</b> ${escapeHTML(v.toString())}`
    ).join('\n');

    ctx.reply(
        text,
        {
            'parse_mode': 'HTML',
            'disable_web_page_preview': true,
        }
    );
};
