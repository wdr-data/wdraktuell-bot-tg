import getFaq from '../lib/faq';

export const handleFaq = async (ctx) => {
    const faq = await getFaq(ctx.data.faq);
    await ctx.replyFullNewsBase(faq);
};
