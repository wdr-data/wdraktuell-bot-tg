import dialogflow from 'dialogflow';

const handleText = async (ctx) => {
    const text = ctx.message.text;
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
        /*
        if (result.action in handler.actions) {
            if (chat.trackingEnabled) {
                await chat.track.event(
                    'chat',
                    'dialogflow',
                    result.intent.displayName
                ).send();
            }
            return handler.actions[result.action](chat, result.parameters['fields']);
        }
        */

        await ctx.track(
            'chat',
            'dialogflow',
            result.intent.displayName
        );
        return ctx.reply(result.fulfillmentText);
    }

    console.log('No intent matched.');
    return ctx.reply(`Da bin ich jetzt überfragt. Kannst Du das anders formulieren?`);
};

export default handleText;
