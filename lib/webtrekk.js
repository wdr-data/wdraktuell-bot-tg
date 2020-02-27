import request from 'request-promise-native';

const TRACK_DOMAIN = process.env.TRACK_DOMAIN;
const TRACK_ID = process.env.TRACK_ID;
const TRACK_PLATFORM = process.env.TRACK_PLATFORM;
const TRACK_CHANNEL = process.env.TRACK_CHANNEL;

export default class Webtrekk {
    constructor(uuid) {
        this.uuid = uuid;
        return;
    }

    makeWebtrekkParams(category, action, label, value) {
        const customParams = [
            TRACK_PLATFORM,
            TRACK_CHANNEL,
            category,
            action,
            label,
            value,
        ].filter((item) => !!item
        ).map(encodeURIComponent
        ).join('_');
        return `300,${customParams},0,0,0,0,0,0,0,0`;
    }

    async track(category, action, label, value) {
        const uri = `https://${TRACK_DOMAIN}/${TRACK_ID}/wt`;
        return request.get({
            uri,
            qs: {
                'p': this.makeWebtrekkParams(category, action, label, value),
                'ceid': this.uuid,
            },
        });
    }
}
