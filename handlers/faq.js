import getFaq from '../lib/faq';

export const handleFaq = async (ctx) => {
    const faq = await getFaq(ctx.data.faq);
    await ctx.replyFullNewsBase(faq);
};

export const handleActionFaq = (slug) => {
    return (ctx) => {
        ctx.data.faq = slug;
        return handleFaq(ctx);
    };
};
