import Markup from 'telegraf/markup';

import getFaq from '../lib/faq';
import actionData from '../lib/actionData';

const start = async (ctx) => {
    let faqPostfix = 'default';
    const referral = ctx.startPayload;
    if ([ 'transition' ].includes(referral)) {
        faqPostfix = referral;
    }
    const greeting = await getFaq(`greeting_${faqPostfix}`);
    await ctx.replyFullNewsBase(greeting);

    const analytics = await getFaq(`onboarding_analytics`);
    const extra = Markup.inlineKeyboard([
        [
            Markup.callbackButton(
                'Ja, ist ok',
                actionData('onboarding_analytics', { choice: 'accept', referral })
            ),
        ],
        [
            Markup.callbackButton(
                'Nein, für mich nicht',
                actionData('onboarding_analytics', { choice: 'decline', referral })
            ),
        ],
        [
            Markup.callbackButton(
                'Datenschutz',
                actionData('onboarding_analytics', { choice: 'policy', referral })
            ),
        ],
    ]).extra();
    await ctx.replyFullNewsBase(analytics, extra);
};

export default start;
