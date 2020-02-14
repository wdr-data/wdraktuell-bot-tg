import Markup from 'telegraf/markup';
import ua from 'universal-analytics';

import actionData from '../lib/actionData';
import DynamoDbCrud from '../lib/dynamodbCrud';

const subscriptionMap = {
    'morning': 'Morgens',
    'evening': 'Abends',
    'breaking': 'Eilmeldungen',
    'analytics': 'Analytics',
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
            /*
            if (ctx.trackingEnabled) {
                ua(
                    process.env.UA_TRACKING_ID,
                    ctx.uuid,
                ).event('handleSubscription', 'analytics', ctx.data.enable).send();
            }
            */
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
                })
            ),
            Markup.callbackButton(
                `${ctx.subscriptions.evening ? '✅' : '❌'} Abends`,
                actionData('subscriptions', {
                    subscription: 'evening',
                    enable: !ctx.subscriptions.evening,
                })
            ),
        ],
        [
            Markup.callbackButton(
                `${ctx.subscriptions.breaking ? '✅' : '❌'} Eilmeldungen`,
                actionData('subscriptions', {
                    subscription: 'breaking',
                    enable: !ctx.subscriptions.breaking,
                })
            ),
            Markup.callbackButton(
                `${ctx.trackingEnabled ? '✅' : '❌'} Analytics`,
                actionData('subscriptions', {
                    subscription: 'analytics',
                    enable: !ctx.trackingEnabled,
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
