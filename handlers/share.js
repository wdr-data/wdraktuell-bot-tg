import getFaq from '../lib/faq';
import { Markup } from 'telegraf';


export const handleShareBotCommand = async (ctx) => {
    const faq = await getFaq('share');
    await ctx.replyFullNewsBase(faq);

    const shareUrl = 'https://t.me/wdraktuell_bot?start=sharingmenu';
    const sharePic = 'https://images.informant.einslive.de/75788e87-9bae-44d5-998b-fb41ff3570d3.png';
    const title ='Alles was NRW bewegt';
    const extra = {
        'reply_markup': Markup.inlineKeyboard(
            [ [ Markup.urlButton( `Jetzt starten`, shareUrl) ] ]
        ),
    };
    return ctx.replyWithPhoto(sharePic, { caption: title, ...extra });
};
