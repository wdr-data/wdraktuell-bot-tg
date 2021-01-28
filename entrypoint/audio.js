import Raven from 'raven';
import RavenLambdaWrapper from 'serverless-sentry-lib';
import request from 'request-promise-native';
import { load } from 'cheerio';
import { getAttachmentId } from '../lib/attachments';
import dynamoDb from '../lib/dynamodb';
import urls from '../lib/urls';
const tableName = process.env.DYNAMODB_AUDIOS;

export const scrape = RavenLambdaWrapper.handler(Raven, async (event, context, callback) => {
    try {
        const audioResponse = await request({
            uri: process.env.INFOS_AUDIO_URL,
        });
        const $ = load(audioResponse, { xmlMode: true });
        const url = $('rss > channel > item').first().find('enclosure')[0].attribs.url;
        const title = $('rss > channel > item').first().find('title').text();
        const existsParam = {
            TableName: tableName,
            KeyConditionExpression: '#urlattr = :url',
            ExpressionAttributeNames: {
                '#urlattr': 'url',
            },
            ExpressionAttributeValues: {
                ':url': url,
            },
        };

        const exists = await new Promise((resolve, reject) => {
            dynamoDb.query(existsParam, (err, result) => {
                // handle potential errors
                if (err) {
                    reject(err);
                    return;
                }

                // create a response
                if (result.Items && result.Items.length > 0) {
                    resolve(true);
                } else {
                    resolve(false);
                }
            });
        });

        if (exists) {
            return callback(null, {
                statusCode: 200,
                body: 'Audio already parsed',
            });
        }

        await getAttachmentId(url);

        const putParam = {
            TableName: tableName,
            Item: {
                url,
                time: Math.floor(new Date()),
                date: new Date().toISOString().split('T')[0],
                title,
            },
        };

        await new Promise((resolve, reject) => {
            dynamoDb.put(putParam, (err) => {
                // handle potential errors
                if (err) {
                    reject(err);
                    return;
                }
                resolve();
            });
        });
        return callback(null, {
            statusCode: 200,
            body: 'Audio parsed successfully: ' + url,
        });
    } catch (e) {
        console.error(e);
        callback(null, {
            statusCode: 500,
            body: e.message,
        });
        throw e;
    }
});


export const podcasts = RavenLambdaWrapper.handler(Raven, async (event, context, callback) => {
    const podcastNames = [ '0630_by_WDR_aktuell_WDR_Online' ];

    for (const podcastName of podcastNames) {
        const response = await request({
            uri: urls.documentsByShow(1, 1, podcastName),
            json: true,
        });
        const episode = response.data[0];
        const podcastUrl = episode.podcastUrl;

        const headers = await request.head(podcastUrl);
        const largeFile = Number.parseInt(headers['content-length']) > 20000000;

        if (!largeFile) {
            try {
                await getAttachmentId(podcastUrl);
            } catch (e) {
                console.log(JSON.stringify(e, null, 2));
            }
        }
    }
});
