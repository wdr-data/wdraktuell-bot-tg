import Markup from 'telegraf/markup';

import actionData from '../lib/actionData';
import DynamoDbCrud from '../lib/dynamodbCrud';
import Webtrekk from '../lib/webtrekk';

const subscriptionMap = {
    'morning': 'Morgens',
    'evening': 'Abends',
    'breaking': 'Eilmeldungen',
    'analytics': 'Analytics',
};

export const handleSubscriptionsCommand = async (ctx) => {
    ctx.track({
        category: 'Menüpunkt',
        event: 'Command-Menü',
        label: 'action',
    });
    await handleSubscriptions(ctx);
};

export const handleSubscriptions = async (ctx) => {
    if (ctx.callbackQuery) {
        if ([ 'morning', 'evening', 'breaking' ].includes(ctx.data.subscription)) {
            const subscriptions = new DynamoDbCrud(process.env.DYNAMODB_SUBSCRIPTIONS, 'tgid');
            await subscriptions.update(ctx.from.id, ctx.data.subscription, ctx.data.enable);
            ctx.subscriptions[ctx.data.subscription] = ctx.data.enable;
        } else if ([ 'analytics' ].includes(ctx.data.subscription)) {
            const tracking = new DynamoDbCrud(process.env.DYNAMODB_TRACKING, 'tgid');
            await tracking.update(ctx.from.id, 'enabled', ctx.data.enable);
            ctx.trackingEnabled = ctx.data.enable;
            if (ctx.trackingEnabled) {
                new Webtrekk(
                    ctx.uuid,
                ).track({
                    category: 'Menüpunkt',
                    event: 'Einstellungen',
                    label: 'Tracking',
                    subType: 'Aktiviert',
                    actionSwitch: 'on',
                });
            }
        }
        await ctx.answerCbQuery(
            `${ctx.data.enable ? '✅': '❌'} ` +
            `${subscriptionMap[ctx.data.subscription]} ` +
            `${ctx.data.enable ? 'an': 'ab'}gemeldet.`
        );
    }

    const buttons = [
        [
            Markup.callbackButton(
                `${ctx.subscriptions.morning ? '✅' : '❌'} Morgens`,
                actionData('subscriptions', {
                    subscription: 'morning',
                    enable: !ctx.subscriptions.morning,
                    track: {
                        category: 'Menüpunkt',
                        event: 'Einstellungen',
                        label: 'Morgen-Push',
                        subType: !ctx.subscriptions.morning ? 'Anmelden' : 'Abmelden',
                        actionSwitch: !ctx.subscriptions.morning ? 'on' : 'off',
                    },
                })
            ),
            Markup.callbackButton(
                `${ctx.subscriptions.evening ? '✅' : '❌'} Abends`,
                actionData('subscriptions', {
                    subscription: 'evening',
                    enable: !ctx.subscriptions.evening,
                    track: {
                        category: 'Menüpunkt',
                        event: 'Einstellungen',
                        label: 'Abend-Push',
                        subType: !ctx.subscription.evening ? 'Anmelden' : 'Abmelden',
                        actionSwitch: !ctx.subscription.evening ? 'on' : 'off',
                    },
                })
            ),
        ],
        [
            Markup.callbackButton(
                `${ctx.subscriptions.breaking ? '✅' : '❌'} Eilmeldungen`,
                actionData('subscriptions', {
                    subscription: 'breaking',
                    enable: !ctx.subscriptions.breaking,
                    track: {
                        category: 'Menüpunkt',
                        event: 'Einstellungen',
                        label: 'Eilmeldungen',
                        subType: !ctx.subscriptions.breaking ? 'Anmelden' : 'Abmelden',
                        actionSwitch: !ctx.subscriptions.breaking ? 'on' : 'off',
                    },
                })
            ),
            Markup.callbackButton(
                `${ctx.trackingEnabled ? '✅' : '❌'} Analytics`,
                actionData('subscriptions', {
                    subscription: 'analytics',
                    enable: !ctx.trackingEnabled,
                    track: {
                        category: 'Menüpunkt',
                        event: 'Einstellungen',
                        label: 'Tracking',
                        subType: !ctx.trackingEnabled ? 'Aktiviert' : 'Deaktiviert',
                        actionSwitch: !ctx.trackingEnabled ? 'on' : 'off',
                    },
                })
            ),
        ],
    ];
    const markup = Markup.inlineKeyboard(buttons);
    if (ctx.callbackQuery) {
        await ctx.editMessageReplyMarkup(markup);
    } else {
        await ctx.reply(
            'Tippe auf die Buttons, um deine Einstellungen zu ändern.\n' +
            '✅ = An\n' +
            '❌ = Aus',
            markup.extra()
        );
    }
};
