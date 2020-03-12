import dialogflow from 'dialogflow';

import { actions } from './index.js';
import { handleContact } from './contact.js';

const handleText = async (ctx) => {
    const text = ctx.message.text;

    switch (text) {
    case '#ich':
        return ctx.reply(
            `Deine Telegram-ID ist \`${ctx.from.id}\``,
            { 'parse_mode': 'MarkdownV2' }
        );
    case '#uuid':
        return ctx.reply(
            `Deine UUID ist \`${ctx.uuid}\``,
            { 'parse_mode': 'MarkdownV2' }
        );
    }

    if ( text.length > 70 ) {
        return handleContact(ctx);
    }

    const sessionClient = new dialogflow.SessionsClient({
        /* eslint-disable */
        credentials: require('../.df_id.json') || {},
        /* eslint-enable */
    });
    const sessionPath = sessionClient.sessionPath(process.env.DF_PROJECTID, ctx.uuid);

    const request = {
        session: sessionPath,
        queryInput: {
            text: {
                text: text.slice(0, 255),
                languageCode: 'de-DE',
            },
        },
    };

    const responses = await sessionClient.detectIntent(request);
    console.log('Detected intent');
    const result = responses[0].queryResult;
    console.log(`  Query: ${result.queryText}`);
    console.log(`  Response: ${result.fulfillmentText}`);
    if (result.intent) {
        console.log(`  Intent: ${result.intent.displayName}`);
        console.log(`  Parameters: ${JSON.stringify(result.parameters)}`);
        console.log(`  Action: ${result.action}`);

        if (result.action in actions) {
            ctx.dialogflowParams = result.parameters.fields;
            ctx.track({
                category: 'Unterhaltung',
                event: 'Dialogflow',
                label: result.intent.displayName,
            });
            return actions[result.action](ctx);
        }

        ctx.track({
            category: 'Unterhaltung',
            event: 'Dialogflow',
            label: result.intent.displayName,
        });
        return ctx.reply(result.fulfillmentText);
    }

    console.log('No intent matched.');
    return ctx.reply(`Da bin ich jetzt überfragt. Kannst Du das anders formulieren?`);
};

export default handleText;
