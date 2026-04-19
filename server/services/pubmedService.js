const axios = require('axios');

async function fetchPubMed(query, maxResults = 50) {
  try {
    console.log(`🔍 Fetching PubMed for: ${query}`);

    // Step 1: Search for article IDs
    const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi`;
    const searchResponse = await axios.get(searchUrl, {
      params: {
        db: 'pubmed',
        term: query,
        retmax: maxResults,
        sort: 'pub date',
        retmode: 'json'
      }
    });

    const ids = searchResponse.data.esearchresult.idlist;
    console.log(`✅ PubMed found ${ids.length} IDs`);

    if (ids.length === 0) return [];

    // Step 2: Fetch details for those IDs
    const fetchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi`;
    const fetchResponse = await axios.get(fetchUrl, {
      params: {
        db: 'pubmed',
        id: ids.join(','),
        retmode: 'xml'
      }
    });

    // Step 3: Parse the XML response
    const xml = fetchResponse.data;
    const articles = [];

    // Extract each article using regex (simple approach)
    const articleMatches = xml.match(/<PubmedArticle>[\s\S]*?<\/PubmedArticle>/g) || [];

    for (const articleXml of articleMatches) {
      // Extract title
      const titleMatch = articleXml.match(/<ArticleTitle>([\s\S]*?)<\/ArticleTitle>/);
      const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : 'No title';

      // Extract abstract
      const abstractMatch = articleXml.match(/<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/);
      const abstract = abstractMatch ? abstractMatch[1].replace(/<[^>]+>/g, '').trim() : 'No abstract available';

      // Extract year
      const yearMatch = articleXml.match(/<PubDate>[\s\S]*?<Year>(\d{4})<\/Year>/);
      const year = yearMatch ? yearMatch[1] : 'Unknown';

      // Extract PMID
      const pmidMatch = articleXml.match(/<PMID[^>]*>(\d+)<\/PMID>/);
      const pmid = pmidMatch ? pmidMatch[1] : null;

      // Extract authors
      const authorMatches = articleXml.match(/<LastName>([\s\S]*?)<\/LastName>/g) || [];
      const authors = authorMatches.slice(0, 3).map(a => a.replace(/<[^>]+>/g, '').trim());

      if (title && title !== 'No title') {
        articles.push({
          title,
          abstract: abstract.substring(0, 500),
          authors,
          year,
          source: 'PubMed',
          url: pmid ? `https://pubmed.ncbi.nlm.nih.gov/${pmid}/` : null,
          pmid
        });
      }
    }

    console.log(`✅ PubMed parsed ${articles.length} articles`);
    return articles;

  } catch (error) {
    console.error('❌ PubMed error:', error.message);
    return [];
  }
}

module.exports = { fetchPubMed };