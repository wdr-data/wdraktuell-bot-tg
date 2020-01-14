import path from 'path';

import { Telegram } from 'telegraf';

import DynamoDbCrud from './dynamodbCrud';

export function guessAttachmentType(filename) {
    // Guesses the attachment type from the file extension
    const ext = path.extname(filename).toLowerCase();
    const types = {
        '.jpg': 'image',
        '.jpeg': 'image',
        '.png': 'image',
        '.gif': 'document',
        '.mp4': 'video',
        '.mp3': 'audio',
    };

    return types[ext] || null;
}

export async function uploadAttachment(url) {
    const bot = new Telegram(process.env.TG_TOKEN);
    const type = guessAttachmentType(url);
    const sendMapping = {
        image: bot.sendPhoto,
        document: bot.sendDocument,
        audio: bot.sendAudio,
        video: bot.sendVideo,
    };
    return sendMapping[type](Number(process.env.TG_FILE_UPLOAD_CHANNEL_ID), url);
}

export async function getAttachmentId(url) {
    console.log(`Uploading file at "${url}"`);
    const attachments = new DynamoDbCrud(process.env.DYNAMODB_ATTACHMENTS, 'url');
    const item = await attachments.load(url);

    if (item) {
        console.log(`AttachmentId in DB: ${item.attachment_id}`);
        return item.attachment_id;
    } else {
        const newAttachmentId = await uploadAttachment(url);
        await attachments.create(url, { 'attachment_id': newAttachmentId });
        console.log(`Uploaded and saved in DB: ${newAttachmentId}`);
        return newAttachmentId;
    }
}
