import Markup from 'telegraf/markup';
import ua from 'universal-analytics';

import getFaq from '../lib/faq';
import actionData from '../lib/actionData';
import DynamoDbCrud from '../lib/dynamodbCrud';

const analyticsButtons = (variant, referral) => {
    const buttons = [
        Markup.callbackButton(
            'Ja, ist ok',
            actionData('onboarding_analytics', {
                choice: 'accept',
                referral,
                tracking: {
                    category: 'onboarding',
                    event: 'analytics',
                    label: 'accept',
                },
            })
        ),
        Markup.callbackButton(
            'Nein, für mich nicht',
            actionData('onboarding_analytics', {
                choice: 'decline',
                referral,
            })
        ),
    ];

    if (variant === 'policy') {
        buttons.push(
            Markup.callbackButton(
                'Datenschutz',
                actionData('onboarding_analytics', {
                    choice: 'policy',
                    referral,
                })
            )
        );
    } else if (variant === 'more') {
        buttons.push(
            Markup.callbackButton(
                'Alles lesen',
                actionData('onboarding_analytics_more', {
                    referral,
                })
            )
        );
    }

    return buttons.map((button) => [ button ]);
};

export const handleStart = async (ctx) => {
    let faqPostfix = 'default';
    const referral = ctx.startPayload || undefined;
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
    const {
        choice,
        referral,
    } = ctx.data;

    const buttons = [
        Markup.callbackButton(
            'Morgens & Abends',
            actionData('onboarding_push_when', {
                choice: 'both',
            })
        ),
        Markup.callbackButton(
            'Morgens',
            actionData('onboarding_push_when', {
                choice: 'morning',
            })
        ),
        Markup.callbackButton(
            'Abends',
            actionData('onboarding_push_when', {
                choice: 'evening',
            })
        ),
    ];
    const extra = Markup.inlineKeyboard(buttons.map((button) => [ button ])).extra();

    switch (choice) {
    case 'accept':
        await ua(
            process.env.UA_TRACKING_ID,
            ctx.uuid,
        ).event('onboarding', 'referral', referral).send();
        await tracking.update(ctx.from.id, 'enabled', true);
        await ctx.replyFullNewsBase(await getFaq('onboarding_analytics_accepted'));
        await ctx.replyFullNewsBase(await getFaq('onboarding_when'), extra);
        break;
    case 'decline':
        await tracking.update(ctx.from.id, 'enabled', false);
        await ctx.replyFullNewsBase(await getFaq('onboarding_analytics_declined'));
        await ctx.replyFullNewsBase(await getFaq('onboarding_when'), extra);
        break;
    case 'policy': {
        const extra = Markup.inlineKeyboard(analyticsButtons('more', referral)).extra();
        await ctx.replyFullNewsBase(await getFaq('onboarding_analytics_policy'), extra);
        break;
    }
    }
};

export const handleOnboardingAnalyticsMore = async (ctx) => {
    const {
        referral,
    } = ctx.data;
    const extra = Markup.inlineKeyboard(analyticsButtons(null, referral)).extra();
    await ctx.replyFullNewsBase(await getFaq('analytics_datapolicy_full'), extra);
};

export const handleOnboardingPushWhen = async (ctx) => {
    const {
        choice,
    } = ctx.data;

    const subscriptions = new DynamoDbCrud(process.env.DYNAMODB_SUBSCRIPTIONS, 'tgid');
    if ([ 'morning', 'both' ].includes(choice)) {
        await subscriptions.update(ctx.from.id, 'morning', true);
    }
    if ([ 'evening', 'both' ].includes(choice)) {
        await subscriptions.update(ctx.from.id, 'evening', true);
    }

    const buttons = [
        Markup.callbackButton(
            'Ja, gerne',
            actionData('onboarding_push_breaking', {
                choice: true,
            })
        ),
        Markup.callbackButton(
            'Nein, danke',
            actionData('onboarding_push_breaking', {
                choice: false,
            })
        ),
    ];
    const extra = Markup.inlineKeyboard(buttons.map((button) => [ button ])).extra();
    await ctx.replyFullNewsBase(await getFaq('onboarding_breaking'), extra);
};

export const handleOnboardingPushBreaking = async (ctx) => {
    const {
        choice,
    } = ctx.data;
    const subscriptions = new DynamoDbCrud(process.env.DYNAMODB_SUBSCRIPTIONS, 'tgid');
    await subscriptions.update(ctx.from.id, 'breaking', choice);
    await ctx.replyFullNewsBase(await getFaq('onboarding_final'));
};
