const axios = require('axios');

async function fetchOpenAlex(query, maxResults = 100) {
  try {
    console.log(`🔍 Fetching OpenAlex for: ${query}`);

    const response = await axios.get('https://api.openalex.org/works', {
      params: {
        search: query,
        'per-page': maxResults,
        page: 1,
        sort: 'relevance_score:desc',
        filter: 'from_publication_date:2018-01-01'
      }
    });

    const results = response.data.results || [];
    console.log(`✅ OpenAlex found ${results.length} results`);

    const articles = results.map(work => {
      // Get authors (first 3)
      const authors = (work.authorships || [])
        .slice(0, 3)
        .map(a => a.author?.display_name || 'Unknown');

      // Get abstract (OpenAlex stores it as inverted index, so use a fallback)
      let abstract = 'No abstract available';
      if (work.abstract_inverted_index) {
        // Reconstruct abstract from inverted index
        const wordPositions = [];
        for (const [word, positions] of Object.entries(work.abstract_inverted_index)) {
          positions.forEach(pos => wordPositions.push({ word, pos }));
        }
        wordPositions.sort((a, b) => a.pos - b.pos);
        abstract = wordPositions.map(wp => wp.word).join(' ').substring(0, 500);
      }

      return {
        title: work.display_name || 'No title',
        abstract,
        authors,
        year: work.publication_year || 'Unknown',
        source: 'OpenAlex',
        url: work.doi ? `https://doi.org/${work.doi.replace('https://doi.org/', '')}` : work.id,
        citationCount: work.cited_by_count || 0
      };
    });

    return articles;

  } catch (error) {
    console.error('❌ OpenAlex error:', error.message);
    return [];
  }
}

module.exports = { fetchOpenAlex };