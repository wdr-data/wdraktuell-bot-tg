import Raven from 'raven';
import Telegraf from 'telegraf';

const checkForToken = (event) => event.pathParameters.token === process.env.TG_TOKEN;

export const update = async (event, context, callback) => {
    if (!checkForToken(event)) {
        callback(null, {
            statusCode: 403,
            body: '',
        });
        Raven.captureMessage('illegal token');
        return;
    }

    const telegraf = new Telegraf(process.env.TG_TOKEN);
    try {
        const payload = JSON.parse(event.body);

        callback(null, {
            statusCode: 200,
            body: '',
        });

        console.log(JSON.stringify(payload, null, 2));

        telegraf.start((ctx) => ctx.reply('Hallo'));

        telegraf.catch((err, ctx) => {
            console.error('ERROR:', err);
            Raven.captureException(err);
            return ctx.reply('Da ist was schief gelaufen.');
        });

        await telegraf.handleUpdate(payload);
    } catch (error) {
        console.error('ERROR:', error);
        Raven.captureException(error);
    }
};
