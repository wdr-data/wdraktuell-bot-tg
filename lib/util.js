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
        const campaignPlattform = 'telegram';
        const campaignChannel = 'wdr_aktuell';
        const campaignType = push ? `${push.timing}-push` : 'breaking-push';
        const campaignName = `${report.headline}-${report.id}`;
        urlInfo.searchParams.append(
            'wt_mc', `${campaignPlattform}.${campaignChannel}.${campaignType}.${campaignName}`
        );
        return urlInfo.href;
    } else {
        return report.link;
    }
};
