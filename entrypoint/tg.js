import Raven from 'raven';
import Telegraf from 'telegraf';

import { CustomContext } from '../lib/customContext';
import { handleText } from '../handlers/text';

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

    const bot = new Telegraf(process.env.TG_TOKEN, { contextType: CustomContext });
    try {
        const payload = JSON.parse(event.body);

        callback(null, {
            statusCode: 200,
            body: '',
        });

        console.log(JSON.stringify(payload, null, 2));

        bot.start((ctx) => ctx.reply('Hallo'));

        bot.hears(() => true, handleText);

        bot.catch((err, ctx) => {
            console.error('ERROR:', err);
            Raven.captureException(err);
            return ctx.reply('Da ist was schief gelaufen.');
        });

        await bot.handleUpdate(payload);
    } catch (error) {
        console.error('ERROR:', error);
        Raven.captureException(error);
    }
};
