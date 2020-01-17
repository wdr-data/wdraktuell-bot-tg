import moment from 'moment-timezone';

export default async (ctx) => {
    const time = moment.tz('Europe/Berlin').format('HH:mm:ss');
    return ctx.reply(`Die exakte Uhrzeit: ${time} Uhr`);
};
