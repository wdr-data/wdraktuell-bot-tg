/* eslint-disable camelcase */
import { handleSubscriptions } from './subscriptions';
import handleCurrentNews from './currentNews';
import handleCurrentTime from './currentTime';
import {
    handleContact,
    handleContactComment,
    handleContactTopicSuggestion,
    handleContactThankYou } from './contact';

export const actions = {
    subscriptions: handleSubscriptions,
    current_news: handleCurrentNews,
    current_time: handleCurrentTime,
    contact: handleContact,
    contact_comment: handleContactComment,
    contact_topic_suggestion: handleContactTopicSuggestion,
    contact_say_thank_you: handleContactThankYou,
};
