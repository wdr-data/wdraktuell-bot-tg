import Markup from 'telegraf/markup';

import getFaq from '../lib/faq';
import actionData from '../lib/actionData';

export const handleContact = async (ctx) => {
    const contact = await getFaq(`contact`);
    const buttons = [
        Markup.callbackButton(
            'Anregungen zum Inhalt',
            actionData('contact_comment', {
                tracking: {
                    category: 'payload',
                    event: 'contact',
                    label: 'user_leaves_commentary',
                },
            })
        ),
        Markup.callbackButton(
            'Ein Thema vorschlagen',
            actionData('contact_topic_suggestion', {
                tracking: {
                    category: 'payload',
                    event: 'contact',
                    label: 'user_gives_topic_suggestion',
                },
            })
        ),
        Markup.callbackButton(
            'Einfach mal Danke sagen!',
            actionData('contact_say_thank_you', {
                tracking: {
                    category: 'payload',
                    event: 'contact',
                    label: 'user_says_thank_you',
                },
            })
        ),
    ];

    const extra = Markup.inlineKeyboard(buttons.map((button) => [ button ])).extra();
    await ctx.replyFullNewsBase(contact, extra);
};

export const handleContactComment = async (ctx) => {
    const handleContactComment = await getFaq(`contact_comment`);
    await ctx.replyFullNewsBase(handleContactComment);
};

export const handleContactTopicSuggestion = async (ctx) => {
    const contactTopicSuggestion = await getFaq(`contact_topic_suggestion`);
    await ctx.replyFullNewsBase(contactTopicSuggestion);
};

export const handleContactThankYou = async (ctx) => {
    const handleContactThankYou = await getFaq(`contact_say_thank_you`);
    await ctx.replyFullNewsBase(handleContactThankYou);
};
