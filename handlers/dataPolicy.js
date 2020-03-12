import getFaq from '../lib/faq';

export default async (ctx) => {
    let faq = await getFaq('datenschutz_general');
    await ctx.replyFullNewsBase(faq);
    faq = await getFaq('datenschutz_tracking');
    await ctx.replyFullNewsBase(faq);
    faq = await getFaq('datenschutz_policies');
    await ctx.replyFullNewsBase(faq);
};
