import Markup from 'telegraf/markup';

import getFaq from '../lib/faq';
import actionData from '../lib/actionData';
import DynamoDbCrud from '../lib/dynamodbCrud';

const analyticsButtons = (variant, referral) => {
    const buttons = [
        Markup.callbackButton(
            'Ja, ist ok',
            actionData('onboarding_analytics', { choice: 'accept', referral })
        ),
        Markup.callbackButton(
            'Nein, für mich nicht',
            actionData('onboarding_analytics', { choice: 'decline', referral })
        ),
    ];

    if (variant === 'policy') {
        buttons.push(
            Markup.callbackButton(
                'Datenschutz',
                actionData('onboarding_analytics', { choice: 'policy', referral })
            )
        );
    } else if (variant === 'more') {
        buttons.push(
            Markup.callbackButton(
                'Alles lesen',
                actionData('onboarding_analytics_more', { referral })
            )
        );
    }

    return buttons.map((button) => [ button ]);
};

export const handleStart = async (ctx) => {
    let faqPostfix = 'default';
    const referral = ctx.startPayload;
    if ([ 'transition' ].includes(referral)) {
        faqPostfix = referral;
    }
    const greeting = await getFaq(`greeting_${faqPostfix}`);
    await ctx.replyFullNewsBase(greeting);

    const analytics = await getFaq(`onboarding_analytics`);
    const extra = Markup.inlineKeyboard(analyticsButtons('policy', referral)).extra();
    await ctx.replyFullNewsBase(analytics, extra);
};

export const handleOnboardingAnalytics = async (ctx) => {
    const tracking = new DynamoDbCrud(process.env.DYNAMODB_TRACKING, 'tgid');
    const { choice, referral } = ctx.data;

    switch (choice) {
    case 'accept':
        await tracking.update(ctx.from.id, 'enabled', true);
        await ctx.replyFullNewsBase(await getFaq('onboarding_analytics_accepted'));
        break;
    case 'decline':
        await tracking.update(ctx.from.id, 'enabled', false);
        await ctx.replyFullNewsBase(await getFaq('onboarding_analytics_declined'));
        break;
    case 'policy': {
        const extra = Markup.inlineKeyboard(analyticsButtons('more', referral)).extra();
        await ctx.replyFullNewsBase(await getFaq('onboarding_analytics_policy'), extra);
        break;
    }
    }
};

export const handleOnboardingAnalyticsMore = async (ctx) => {
    const { referral } = ctx.data;
    const extra = Markup.inlineKeyboard(analyticsButtons(null, referral)).extra();
    await ctx.replyFullNewsBase(await getFaq('analytics_datapolicy_full'), extra);
};
