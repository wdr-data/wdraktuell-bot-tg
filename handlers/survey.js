import Markup from 'telegraf/markup';

import DynamoDbCrud from '../lib/dynamodbCrud';
import { getFaq } from '../lib/faq';
import actionData from '../lib/actionData';
import surveyData from '../data/surveyQuestions';


export async function startSurvey(ctx) {
    const unsubscribedSurvey = await getFaq('unsubscribed-survey', true);

    const userStates = new DynamoDbCrud(process.env.DYNAMODB_USERSTATES, 'uuid');
    try {
        await userStates.create(ctx.uuid, { 'surveyTime': Math.floor( Date.now()/1000 ) } );
        console.log('Enable survey mode.');
    } catch (e) {
        await userStates.update(ctx.uuid, 'surveyTime', Math.floor( Date.now()/1000 ) );
        console.log('Update survey mode');
    }

    await ctx.replyFullNewsBase(unsubscribedSurvey, { 'disable_web_page_preview': true });
    ctx.data.nextStep = 0;
    return handleSurvey(ctx);
}

export async function handleSurvey(ctx) {
    if (ctx.data.nextStep === surveyData.length) {
        return ctx.replyFullNewsBase(
            await getFaq('unsubscribed-survey-done', true)
        );
    }
    const survey = surveyData[ctx.data.nextStep];
    let buttons = [];
    survey.answers.forEach(
        (answer) => buttons.push([
            Markup.callbackButton(
                answer,
                actionData('survey', {
                    nextStep: ctx.data.nextStep + 1,
                    removeKeyboard: true,
                    replyHTML: `<b>➡️ ${answer}</b>`,
                    track: {
                        category: 'Feature',
                        event: 'Umfrage-Abmelden',
                        label: survey.question,
                        subType: answer,
                    },
                })
            ),
        ]),
    );
    const markup = Markup.inlineKeyboard(buttons);
    return ctx.reply(
        survey.question,
        markup.extra(),
    );
}
