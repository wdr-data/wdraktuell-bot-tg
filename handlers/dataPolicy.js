import getFaq from '../lib/faq';

export default async (ctx) => {
    let faq = await getFaq('datenschutz');
    await ctx.replyFullNewsBase(faq);
    faq = await getFaq('datenschutz2');
    await ctx.replyFullNewsBase(faq);
    faq = await getFaq('datenschutz3');
    await ctx.replyFullNewsBase(faq);
};
