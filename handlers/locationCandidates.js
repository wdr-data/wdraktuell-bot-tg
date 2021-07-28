import request from 'request-promise-native';

import urls from '../lib/urls';
// import { escapeHTML, trackLink } from '../lib/util';


export const handleLocationCandidates = async (ctx) => {
    const wahlkreis = {
        'id': 101,
        'city': 'Leverkusen, Stadt',
        'zipCode': 51373,
        'wahlkreisName': 'Leverkusen - Köln IV',
    };
    return handleWahlkreis(ctx, wahlkreis);
};

export const handleWahlkreis = async (ctx, wahlkreis) => {
    ctx.reply('test 1');
    const response = await request({
        uri: urls.candidatesByWahlkreisId(wahlkreis.id),
        json: true,
    });

    const candidates = response.data.map((c) => {
        return `{$c.kandidatVorname} {$c.kandidatNachname}, {$c.kandidatPartei}`;
    });

    const text = candidates.joint('\n\n');
    ctx.reply(text);
};

