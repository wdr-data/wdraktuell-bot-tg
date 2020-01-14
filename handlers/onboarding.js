import getFaq from '../lib/faq';

const start = async (ctx) => {
    const faq = await getFaq('greeting_default');
    return ctx.replyFullNewsBase(faq);
};

export default start;
