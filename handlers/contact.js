import Markup from 'telegraf/markup';

import getFaq from '../lib/faq';
import actionData from '../lib/actionData';

export const handleContact = async (ctx) => {
    const contact = await getFaq(`contact`);
    const buttons = [
        Markup.callbackButton(
            'Anregungen zum Inhalt',
            actionData('faq', {
                faq: 'contact_comment',
                tracking: {
                    category: 'payload',
                    action: 'contact',
                    label: 'user_leaves_commentary',
                },
            })
        ),
        Markup.callbackButton(
            'Ein Thema vorschlagen',
            actionData('faq', {
                faq: 'contact_topic_suggestion',
                tracking: {
                    category: 'payload',
                    action: 'contact',
                    label: 'user_gives_topic_suggestion',
                },
            })
        ),
        Markup.callbackButton(
            'Einfach mal Danke sagen!',
            actionData('faq', {
                faq: 'contact_say_thank_you',
                tracking: {
                    category: 'payload',
                    action: 'contact',
                    label: 'user_says_thank_you',
                },
            })
        ),
    ];

    const extra = Markup.inlineKeyboard(buttons.map((button) => [ button ])).extra();
    await ctx.replyFullNewsBase(contact, extra);
};
