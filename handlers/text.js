import dialogflow from 'dialogflow';

import { actions } from './index.js';
import { handleContact } from './contact.js';

const handleText = async (ctx) => {
    const text = ctx.message.text;

    switch (text) {
    case '#ich':
        return ctx.reply(
            `Deine Telegram-ID ist <code>${ctx.from.id}</code>`,
            { 'parse_mode': 'HTML' }
        );
    case '#uuid':
        return ctx.reply(
            `Deine UUID ist <code>${ctx.uuid}</code>`,
            { 'parse_mode': 'HTML' }
        );
    }

    if ( text.length > 70 ) {
        ctx.track({
            category: 'Unterhaltung',
            event: 'Feedback-Menü',
            label: '70 Zeichen',
            subtype: text.slice(0, 50),
        });
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

        if (result.parameters.fields.tags && result.parameters.fields.tags.stringValue) {
            await ctx.track({
                category: 'Feature',
                event: 'Themen nach Tag/Genre',
                label: 'Tag',
                subType: result.parameters.fields.tags.stringValue,
            });
        }
        if (result.parameters.fields.genres && result.parameters.fields.genres.stringValue) {
            await ctx.track({
                category: 'Feature',
                event: 'Themen nach Tag/Genre',
                label: 'Genre',
                subType: result.parameters.fields.genres.stringValue,
            });
        }
        if (result.action in actions) {
            ctx.dialogflowParams = result.parameters.fields;
            ctx.dialogflowResponse = result.fulfillmentText;
            ctx.track({
                category: 'Unterhaltung',
                event: 'Dialogflow',
                label: result.intent.displayName,
                subType: result.action,
            });
            return actions[result.action](ctx);
        }

        ctx.track({
            category: 'Unterhaltung',
            event: 'Dialogflow',
            label: result.intent.displayName,
            subType: result.queryText.slice(0, 50),
        });
        return ctx.reply(result.fulfillmentText);
    }

    console.log('No intent matched.');
    return ctx.reply(`Da bin ich jetzt überfragt. Kannst Du das anders formulieren?`);
};

export default handleText;
