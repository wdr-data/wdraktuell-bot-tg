import Markup from 'telegraf/markup';
import request from 'request-promise-native';

import urls from './urls';
import actionData from './actionData';
import { escapeHTML } from '../lib/util';

const countUpBubble = (subType) => {
    if (!subType) {
        return undefined;
    } else if (subType.includes('Bubble')) {
        return subType.replace('3', '4').replace('2', '3').replace('1', '2');
    }
    return subType;
};

export default async (
    ctx,
    fragments,
    initialMessage = null,
) => {
    const messages = [];

    if (initialMessage) {
        messages.push(initialMessage);
    }

    let questionFragment = null;
    if (fragments) {
        for (const fragment of fragments) {
            if (fragment.question) {
                questionFragment = fragment;
                continue;
            }

            messages.push(fragment);
        }
    }

    const isEndOfReport = !questionFragment;

    const quizButtons = [];
    let questionButtonData;
    let buttonLink;
    let buttonAudio;

    if (!isEndOfReport) {
        questionButtonData = {
            ...ctx.data,
            audio: undefined,
            fragment: questionFragment.id,
            removeKeyboard: true,
            replyHTML: `<b>${escapeHTML(questionFragment.question)}</b>`,
            track: {
                ...ctx.data.track,
                subType: countUpBubble(ctx.data.track.subType),
            },
        };
    }

    if (ctx.data.audio) {
        buttonAudio = Markup.callbackButton(
            'Jetzt anhören 🎧',
            actionData('report_audio', {
                ...ctx.data,
                audio: undefined,
                removeKeyboard: true,
                track: {
                    ...ctx.data.track,
                    subType: 'Audio',
                },
            })
        );
    }

    if (ctx.data.type === 'push') {
        const reportButtons = [];

        const params = {
            uri: urls.push(ctx.data.push),
            json: true,
        };
        // Authorize so we can access unpublished items
        if (ctx.data.preview) {
            params.headers = { Authorization: 'Token ' + process.env.CMS_API_TOKEN };
        }
        const push = await request(params);

        const readReports = ctx.data.before;
        if (!readReports.includes(ctx.data.report)) {
            readReports.push(ctx.data.report);
        }
        if (!isEndOfReport) {
            questionButtonData.before = readReports;
            const buttonQuestion = Markup.callbackButton(
                questionFragment.question, actionData('fragment', questionButtonData));
            reportButtons.push(buttonQuestion);
        } else {
            if (ctx.data.quiz) {
                quizButtons.push(...await makeQuizButtons({ ctx, readReports }));
            }
            if (ctx.data.link) {
                buttonLink = Markup.urlButton('Mehr 🌍', ctx.data.link);
            }
        }

        const unreadReports = [];
        for (const r of push.reports) {
            if (!readReports.includes(r.id)) {
                unreadReports.push(r);
            }
        }
        if (unreadReports.length > 0) {
            const next = unreadReports.map((r) => {
                let buttonText;
                if (r.type === 'last') {
                    buttonText = `${r.subtype.emoji} ${r.subtype.title}`;
                } else if (r.short_headline) {
                    buttonText = `➡ ${r.short_headline}`;
                } else {
                    buttonText = `➡ ${r.headline}`;
                }
                return Markup.callbackButton(
                    buttonText,
                    actionData('report', {
                        push: ctx.data.push,
                        timing: ctx.data.timing,
                        report: r.id,
                        type: ctx.data.type,
                        before: readReports,
                        preview: ctx.data.preview,
                        removeKeyboard: true,
                        track: {
                            category: ctx.data.track.category,
                            event: r.subtype ? `Meldung: ${r.subtype.title}` : 'Meldung',
                            label: r.headline,
                            subType: '1.Bubble',
                            publicationDate: r.published_date,
                        },
                    }),
                );
            });
            reportButtons.push(...next);
        }

        const outroButton = Markup.callbackButton(
            '👋 Und Tschüss',
            actionData('push_outro', {
                push: ctx.data.push,
                timing: ctx.data.timing,
                preview: ctx.data.preview,
                removeKeyboard: true,
                replyHTML: `<b>👋 Und Tschüss</b>`,
                track: {
                    category: ctx.data.track.category,
                    event: 'Push-Outro',
                    label: `Outro-Push-ID: ${ctx.data.push}`,
                    subType: `${ctx.data.before.length}-Fragmente`,
                },
            }));

        const buttons = [
            buttonAudio,
            ...reportButtons,
            ...quizButtons,
            buttonLink,
            outroButton,
        ].filter((e) => !!e);

        const extra = {};
        extra['reply_markup'] = Markup.inlineKeyboard(buttons.map((button) => [ button ]));
        await ctx.sendMessages(messages, extra);
    } else if (ctx.data.type === 'report') {
        let buttonQuestion;

        if (!isEndOfReport) {
            buttonQuestion = Markup.callbackButton(
                questionFragment.question, actionData('fragment', questionButtonData));
        } else {
            if (ctx.data.quiz) {
                quizButtons.push(...await makeQuizButtons({ ctx }));
            }
            if (ctx.data.link) {
                buttonLink = Markup.urlButton('Mehr 🌍', ctx.data.link);
            }
        }

        const buttons = [
            buttonQuestion,
            ...quizButtons,
            buttonAudio,
            buttonLink,
        ].filter((e) => !!e);

        const extra = {};
        extra['reply_markup'] = Markup.inlineKeyboard(buttons.map((button) => [ button ]));

        await ctx.sendMessages(messages, extra);
    }
};

const makeQuizButtons = async ({ ctx, readReports }) => {
    const params = {
        uri: urls.quizByReport(ctx.data.report),
        json: true,
    };
    // Authorize so we can access unpublished items
    if (ctx.data.preview) {
        params.headers = { Authorization: 'Token ' + process.env.CMS_API_TOKEN };
    }
    const quiz = await request(params);

    return quiz.map((option) => {
        const data = {
            ...ctx.data,
            option: option.id,
            removeKeyboard: false,
            track: {
                ...ctx.data.track,
                subType: `QuizOption: ${option.quiz_option}`,
            },
        };
        if (readReports) {
            data.before = readReports;
        }
        return Markup.callbackButton(option.quiz_option, actionData('quiz_response', data));
    });
};
