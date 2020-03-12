import Markup from 'telegraf/markup';

import getFaq from '../lib/faq';
import actionData from '../lib/actionData';
import DynamoDbCrud from '../lib/dynamodbCrud';
import Webtrekk from '../lib/webtrekk';

const analyticsButtons = (variant, referral) => {
    const buttons = [
        Markup.callbackButton(
            'Ja, ist ok',
            actionData('onboarding_analytics', {
                choice: 'accept',
                referral,
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
    }

    return buttons.map((button) => [ button ]);
};

export const handleStart = async (ctx) => {
    const referral = ctx.startPayload || undefined;
    let greeting;
    if (referral) {
        greeting = await getFaq(`greeting_${referral}`);
    }
    if (!greeting) {
        greeting = await getFaq(`greeting_default`);
    }

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
                choice: 'morning_evening',
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

    let webtrekk;

    switch (choice) {
    case 'accept':
        webtrekk = new Webtrekk(ctx.uuid);
        webtrekk.track('onboarding', 'referral', referral);
        webtrekk.track('onboarding', 'analytics', 'accepted');
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
        const extra = Markup.inlineKeyboard(analyticsButtons(null, referral)).extra();
        await ctx.replyFullNewsBase(await getFaq('analytics_datapolicy_full'), extra);
        break;
    }
    }

    return ctx.editMessageReplyMarkup();
};

export const handleOnboardingPushWhen = async (ctx) => {
    const {
        choice,
    } = ctx.data;

    const subscriptions = new DynamoDbCrud(process.env.DYNAMODB_SUBSCRIPTIONS, 'tgid');
    if ([ 'morning', 'morning_evening' ].includes(choice)) {
        await subscriptions.update(ctx.from.id, 'morning', true);
        ctx.track('onboarding', 'morning', 'subscribed');
    }
    if ([ 'evening', 'morning_evening' ].includes(choice)) {
        await subscriptions.update(ctx.from.id, 'evening', true);
        ctx.track('onboarding', 'evening', 'subscribed');
    }

    const buttons = [
        Markup.callbackButton(
            'Ja, gerne',
            actionData('onboarding_push_breaking', {
                choice: true,
                tracking: {
                    category: 'onboarding',
                    action: 'breaking',
                    label: 'subscribed',
                },
            })
        ),
        Markup.callbackButton(
            'Nein, danke',
            actionData('onboarding_push_breaking', {
                choice: false,
                tracking: {
                    category: 'onboarding',
                    action: 'breaking',
                    label: 'declined',
                },
            })
        ),
    ];
    const extra = Markup.inlineKeyboard(buttons.map((button) => [ button ])).extra();
    await ctx.replyFullNewsBase(await getFaq(`onboarding_${choice}`));
    await ctx.replyFullNewsBase(await getFaq('onboarding_breaking'), extra);

    return ctx.editMessageReplyMarkup();
};

export const handleOnboardingPushBreaking = async (ctx) => {
    const {
        choice,
    } = ctx.data;
    const subscriptions = new DynamoDbCrud(process.env.DYNAMODB_SUBSCRIPTIONS, 'tgid');
    await subscriptions.update(ctx.from.id, 'breaking', choice);
    await ctx.replyFullNewsBase(await getFaq(`onboarding_breaking_${choice ? 'yes' : 'no'}`));
    await ctx.replyFullNewsBase(await getFaq('onboarding_final'));

    return ctx.editMessageReplyMarkup();
};
