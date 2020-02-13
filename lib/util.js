export function partition(str, separator) {
    str = str.split(separator);

    if (str.length > 1) {
        const ret = str.splice(0, 1);
        ret.push(str.join(separator));

        return ret;
    }

    return str;
}

export const escapeHTML = (str) =>
    str.replace(
        /[&<>]/g,
        (tag) =>
            ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
            }[tag] || tag)
    );

export const trackLink = (report, push = undefined) => {
    const urlInfo = new URL(report.link);
    if (urlInfo.host === 'www1.wdr.de') {
        const campaignType = push ? `${push.timing}-push` : 'breaking-push';
        urlInfo.searchParams.append(
            'wt_mc', `telegram.wdr_aktuell.${campaignType}.${report.headline}-${report.id}`
        );
        return urlInfo.href;
    } else {
        return report.link;
    }
};
