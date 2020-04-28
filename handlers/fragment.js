import request from 'request-promise-native';

import urls from '../lib/urls';
import fragmentSender from '../lib/fragmentSender';

export default async (ctx) => {
    let url = null;
    if (ctx.data.type === 'push' || ctx.data.type === 'report') {
        url = `${urls.reportFragment(ctx.data.fragment)}?withNext=yes`;
    } else if (ctx.data.type === 'faq') {
        url = `${urls.faqFragment(ctx.data.fragment)}?withNext=yes`;
    }

    if (url) {
        const params = { uri: url, json: true };
        // Authorize so we can access unpublished items
        if (ctx.data.preview) {
            params.headers = { Authorization: 'Token ' + process.env.CMS_API_TOKEN };
        }
        let fragment = await request(params);

        if (fragment.isArray) {
            fragment = fragment[0];
        }

        return fragmentSender(ctx, fragment.next_fragments, fragment);
    }
};
