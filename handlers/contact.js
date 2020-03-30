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
                track: {
                    category: 'Menüpunkt',
                    event: 'Feedback-Menü',
                    label: 'Kontakt aufnehmen',
                },
            })
        ),
        Markup.callbackButton(
            'Ein Thema vorschlagen',
            actionData('faq', {
                faq: 'contact_topic_suggestion',
                track: {
                    category: 'Menüpunkt',
                    event: 'Feedback-Menü',
                    label: 'Thema vorschlagen',
                },
            })
        ),
        Markup.callbackButton(
            'Einfach mal Danke sagen!',
            actionData('faq', {
                faq: 'contact_say_thank_you',
                track: {
                    category: 'Menüpunkt',
                    event: 'Feedback-Menü',
                    label: 'Danke sagen',
                },
            })
        ),
    ];

    const extra = Markup.inlineKeyboard(buttons.map((button) => [ button ])).extra();
    await ctx.replyFullNewsBase(contact, extra);
};
