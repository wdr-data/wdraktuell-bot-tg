import getFaq from '../lib/faq';

const start = async (ctx) => {
    let faqPostfix = 'default';
    const referral = ctx.message.text.split(' ').slice(-1)[0];
    if ([ 'transition' ].includes(referral)) {
        faqPostfix = referral;
    }
    const faq = await getFaq(`greeting_${faqPostfix}`);
    return ctx.replyFullNewsBase(faq);
};

export default start;
