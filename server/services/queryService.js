// Takes user input and builds a smart search query
function expandQuery(disease, additionalQuery) {
  let expanded = disease || '';

  if (additionalQuery && additionalQuery.trim() !== '') {
    const cleanQuery = additionalQuery
      .replace(/\b(does|have|any|known|that|significantly|impact|the|is|are|what|how|why|when|which|can|i|my|should|do|will|would|could)\b/gi, '')
      .trim()
      .replace(/\s+/g, ' ');
    
    expanded = `${cleanQuery} AND ${disease}`;
  }

  expanded = expanded.trim().replace(/\s+/g, ' ');
  console.log(`🧠 Query expanded: "${expanded}"`);
  return expanded;
}
// Ranks and filters publications by relevance + recency
function rankPublications(publications, query, topN = 8) {
  const queryWords = query.toLowerCase().split(' ');

  const scored = publications.map(pub => {
    let score = 0;

    // Recency score (newer = higher)
    const year = parseInt(pub.year) || 2000;
    score += (year - 2000) * 2;

    // Relevance score (query words in title = strong signal)
    const titleLower = (pub.title || '').toLowerCase();
    const abstractLower = (pub.abstract || '').toLowerCase();

    queryWords.forEach(word => {
      if (word.length > 3) {
        if (titleLower.includes(word)) score += 10;
        if (abstractLower.includes(word)) score += 3;
      }
    });

    // Citation score (OpenAlex has this)
    if (pub.citationCount) score += Math.min(pub.citationCount / 10, 20);

    return { ...pub, score };
  });

  // Sort by score descending, take top N
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);
}

// Ranks clinical trials
function rankTrials(trials, topN = 6) {
  const statusPriority = {
    'RECRUITING': 3,
    'ACTIVE_NOT_RECRUITING': 2,
    'COMPLETED': 1
  };

  return trials
    .sort((a, b) => {
      const aScore = statusPriority[a.status] || 0;
      const bScore = statusPriority[b.status] || 0;
      return bScore - aScore;
    })
    .slice(0, topN);
}

module.exports = { expandQuery, rankPublications, rankTrials };