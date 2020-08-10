import Raven from 'raven';
import RavenLambdaWrapper from 'serverless-sentry-lib';

import DynamoDbCrud from '../lib/dynamodbCrud';
import { uploadAttachment } from '../lib/attachments';
import schoolData from '../data/schools';
import { generateImageUrl } from '../handlers/locationSchools';
import { sleep } from '../lib/util';

export const uploadSchoolImages = RavenLambdaWrapper.handler(Raven, async (event) => {
    const attachments = new DynamoDbCrud(process.env.DYNAMODB_ATTACHMENTS, 'url');

    for (const [ ags, item ] of Object.entries(schoolData)) {
        if (ags === 'nrw') {
            continue;
        }
        const url = generateImageUrl(ags);
        console.log(`Resolving ${item['name']} with URL ${url}`);

        const attachmentItem = await attachments.load(url);

        if (attachmentItem) {
            console.log(`Already in DB!`);
            continue;
        }

        const newAttachmentId = await uploadAttachment(url);
        await attachments.create(url, { 'attachment_id': newAttachmentId });

        console.log(`Uploaded and resolved to: ${newAttachmentId}`);
        await sleep(1500);
    }
});
