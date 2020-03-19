/* eslint-disable camelcase */
import { handleSubscriptions } from './subscriptions';
import handleCurrentNews from './currentNews';
import handleCurrentTime from './currentTime';
import { handleContact } from './contact';
import { handleFaq } from './faq';
import handleDataPolicy from './dataPolicy';
import { handleLocation } from './location';

export const actions = {
    subscriptions: handleSubscriptions,
    current_news: handleCurrentNews,
    current_time: handleCurrentTime,
    contact: handleContact,
    faq: handleFaq,
    faq_data_protection: handleDataPolicy,
    location: handleLocation,
};
