/* eslint-disable camelcase */
import { handleSubscriptions } from './subscriptions';
import handleCurrentNews from './currentNews';
import handleCurrentTime from './currentTime';
import { handleContact } from './contact';
import { handleFaq } from './faq';
import handleDataPolicy from './dataPolicy';
import { handleDialogflowLocation } from './location';
import { handleNewsfeedStart } from './newsfeed';
import { handleShareBotCommand } from './share';

export const actions = {
    subscriptions: handleSubscriptions,
    current_news: handleCurrentNews,
    current_time: handleCurrentTime,
    contact: handleContact,
    faq: handleFaq,
    faq_data_protection: handleDataPolicy,
    location: handleDialogflowLocation,
    share: handleShareBotCommand,
    location_corona: (ctx) => handleDialogflowLocation(ctx, { type: 'corona' }),
    location_schools: (ctx) => handleDialogflowLocation(ctx, { type: 'schools' }),
    newsfeed_corona: handleNewsfeedStart,
};
