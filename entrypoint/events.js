import Raven from 'raven';
import RavenLambdaWrapper from 'serverless-sentry-lib';

import { getAttachmentId } from '../lib/attachments';
import schoolData from '../data/schools';
import { generateImageUrl } from '../handlers/locationSchools';
import { sleep } from '../lib/util';

export const uploadSchoolImages = RavenLambdaWrapper.handler(Raven, async (event) => {
    for (const [ ags, item ] of Object.entries(schoolData)) {
        if (!item.responded) {
            continue;
        }
        const url = generateImageUrl(ags);
        console.log(`Resolving ${item['Ort']} with URL ${url}`);
        const id = await getAttachmentId(url);
        console.log(`Resolved to: ${id}`);
        await sleep(1000);
    }
});
