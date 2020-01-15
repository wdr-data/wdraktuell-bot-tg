import request from 'request-promise-native';
import urls from '../lib/urls';

export const FAQ_PREFIX = 'wdraktuell-tg';

export const getFaq = async function(slug) {
    const url = urls.fullFaqBySlug(`${FAQ_PREFIX}-${slug}`);
    const faqs = await request({ uri: url, json: true });

    if (faqs.length === 0) {
        throw new Error(`Could not find FAQ with slug "${FAQ_PREFIX}-${slug}"`);
    }

    return faqs[0];
};

export default getFaq;
