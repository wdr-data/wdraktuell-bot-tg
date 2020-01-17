/* eslint-disable camelcase */
import { handleSubscriptions } from './subscriptions';
import handleCurrentNews from './currentNews';
import handleCurrentTime from './currentTime';

export const actions = {
    subscriptions: handleSubscriptions,
    current_news: handleCurrentNews,
    current_time: handleCurrentTime,
};
