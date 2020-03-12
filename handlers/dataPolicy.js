import getFaq from '../lib/faq';

export default async (ctx) => {
    let faq = await getFaq('datenschutz_general');
    await ctx.replyFullNewsBase(faq, { 'disable_web_page_preview': true });
    faq = await getFaq('datenschutz_tracking');
    await ctx.replyFullNewsBase(faq, { 'disable_web_page_preview': true });
    faq = await getFaq('datenschutz_policies');
    await ctx.replyFullNewsBase(faq, { 'disable_web_page_preview': true });
};
