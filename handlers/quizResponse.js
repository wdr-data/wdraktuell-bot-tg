import request from 'request-promise-native';

import urls from '../lib/urls';
import fragmentSender from '../lib/fragmentSender';

export default async (ctx) => {
    let url = null;
    if (ctx.data.type === 'push' || ctx.data.type === 'report') {
        url = `${urls.quizByReport(ctx.data.report)}`;
    }

    if (url) {
        const params = { uri: url, json: true };
        // Authorize so we can access unpublished items
        if (ctx.data.preview) {
            params.headers = { Authorization: 'Token ' + process.env.CMS_API_TOKEN };
        }
        const options = await request(params);
        const chosenOption = options[options.findIndex((o) => o.id === ctx.data.option)];
        ctx.data.quiz = false;
        return fragmentSender(
            ctx, undefined, { text: chosenOption.quiz_text, attachment: chosenOption.attachment });
    }
};
