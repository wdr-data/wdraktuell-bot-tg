export default {
    'push': (id) => `${process.env.CMS_API_URL}pushes/${id}/`,
    'pushes': `${process.env.CMS_API_URL}pushes/`,
    'report': (id) => `${process.env.CMS_API_URL}reports/${id}/`,
    'reportFragment': (id) => `${process.env.CMS_API_URL}reports/fragments/${id}/`,
    'reports': `${process.env.CMS_API_URL}reports/`,
    'quizByReport': (id) => `${process.env.CMS_API_URL}quiz/?report=${id}`,
    'faqBySlug': (slug) => `${process.env.CMS_API_URL}faqs/?slug=${slug}&withFragments=1`,
    'fullFaqBySlug': (slug) => `${process.env.CMS_API_URL}faqs/?slug=${slug}&allFragments=1`,
    'faqFragment': (id) => `${process.env.CMS_API_URL}faqs/fragments/${id}/`,
    'tags': (tag) => `${process.env.CMS_API_URL}tags/?name=${tag}`,
    'genres': (genre) => `${process.env.CMS_API_URL}genres/?name=${genre}`,
    'newsfeedByTopicCategories': (start, count, tag) => {
        const url = new URL(`${
            process.env.EXPORT_BASE_URL
        }/getDocumentsByTopicCategories/AND/${start}/${count}`);
        url.searchParams.append('tags', tag);
        url.searchParams.append('documentType', 'beitrag');
        return url.toString();
    },
    'curatedNewsFeed': (start, count) => {
        const url = new URL(`${
            process.env.EXPORT_BASE_URL
        }/getCuratedNewsStream/${start}/${count}`);
        url.searchParams.append('documentType', 'beitrag');
        return url.toString();
    },
    'documentsByShow': (start, count, show) => {
        const url = new URL(`${
            process.env.EXPORT_BASE_URL
        }/getDocumentsBySendung/${show}/${start}/${count}`);
        return url.toString();
    },
    'candidatesByWahlkreisId': (wahlkreisId) => {
        const url = new URL(`${
            process.env.KANDIDATENCHECK_EXPORT_BASE_URL || process.env.EXPORT_BASE_URL
        }/getKandidatenByWahlkreisIdForStructureNodePath/${wahlkreisId}`);
        url.searchParams.append(
            'structureNodePath',
            '/wdr/kandidatencheck/2021/wdr-bundestagswahl/video'
        );
        return url.toString();
    },
};
