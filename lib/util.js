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


export const regexSlug = (str) => {
    const find = /[^a-zA-Z\u00C0-\u017F -]/gm;
    return str.replace(find, '');
};


export const trackLink = (link, params) => {
    if (!link) {
        return undefined;
    }
    const {
        campaignType,
        campaignName,
        campaignId,
    } = params;
    const urlInfo = new URL(link);
    if (urlInfo.host === 'www1.wdr.de') {
        const campaignPlatform = 'telegram';
        const campaignChannel = 'wdr_aktuell';
        urlInfo.searchParams.append(
            'wt_mc',
            `${
                campaignPlatform
            }.${
                campaignChannel
            }.${
                campaignType
            }.${
                campaignName
            }.nr_${
                campaignId
            }`
        );
        return urlInfo.href;
    } else {
        return link;
    }
};
