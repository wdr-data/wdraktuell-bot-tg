export const handleLocation = async (ctx) => {
    const location = ctx.dialogflowParams.location.structValue.fields;

    let messageText = ctx.dialogflowResponse;
    if (location.city.stringValue) {
        messageText = location.city.stringValue;
    } else if (location['zip-code'].stringValue) {
        messageText = location['zip-code'].stringValue;
    }

    await ctx.reply(messageText);
};
