const { fetchPubMed } = require('../services/pubmedService');
const { fetchOpenAlex } = require('../services/openAlexService');
const { fetchClinicalTrials } = require('../services/clinicalTrialsService');
const { expandQuery, rankPublications, rankTrials } = require('../services/queryService');
const { generateMedicalResponse } = require('../services/llmService');
const Conversation = require('../models/Conversation');

// Helper to generate a simple session ID
function generateSessionId() {
  return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

async function getResearch(req, res) {
  try {
    const { disease, additionalQuery, patientName, location, sessionId } = req.body;

    if (!disease) {
      return res.status(400).json({ error: 'Disease is required' });
    }

    // Step 1: Get or create conversation session
    let currentSessionId = sessionId || generateSessionId();
    let conversation = await Conversation.findOne({ sessionId: currentSessionId });

    if (!conversation) {
      conversation = new Conversation({
        sessionId: currentSessionId,
        disease,
        patientName: patientName || '',
        location: location || '',
        messages: []
      });
    }

    // Step 2: Get conversation history for context
    const conversationHistory = conversation.messages.slice(-6);

    // Step 3: Smart query — use disease from history if not provided in follow-up
    const activeDisease = disease || conversation.disease;
    const expandedQuery = expandQuery(activeDisease, additionalQuery);

    // Step 4: Fetch from all sources in parallel — including TWO clinical trial queries
    console.log('🚀 Fetching from all sources in parallel...');
    const [pubmedResults, openAlexResults, diseaseTrials, queryTrials] = await Promise.all([
      fetchPubMed(expandedQuery, 100),
      fetchOpenAlex(expandedQuery, 200),
      // Trial fetch 1: always by disease (broad)
      fetchClinicalTrials(activeDisease, activeDisease, 50),
      // Trial fetch 2: by user's specific question (targeted)
      fetchClinicalTrials(activeDisease, additionalQuery || activeDisease, 30),
      fetchClinicalTrials(activeDisease, activeDisease, 30, location),
      fetchClinicalTrials(activeDisease, additionalQuery || activeDisease, 20, location)
    ]);

    console.log(`📊 Raw results — PubMed: ${pubmedResults.length}, OpenAlex: ${openAlexResults.length}, Disease Trials: ${diseaseTrials.length}, Query Trials: ${queryTrials.length}`);

    // Step 5: Combine publications
    const allPublications = [...pubmedResults, ...openAlexResults];

    // Step 6: Combine trials and remove duplicates by nctId or title
    const allTrials = [...diseaseTrials, ...queryTrials];
    const uniqueTrials = allTrials.filter((trial, index, self) =>
      index === self.findIndex(t =>
        t.nctId ? t.nctId === trial.nctId : t.title === trial.title
      )
    );

    // Step 7: Separate trials into two categories for display
    const diseaseTrialIds = new Set(diseaseTrials.map(t => t.nctId || t.title));
    const queryTrialIds = new Set(queryTrials.map(t => t.nctId || t.title));

    // Trials only in disease search
    const diseaseOnlyTrials = uniqueTrials.filter(t =>
      diseaseTrialIds.has(t.nctId || t.title) &&
      !queryTrialIds.has(t.nctId || t.title)
    );

    // Trials found in query-specific search (Vitamin D + lung cancer etc)
    const querySpecificTrials = uniqueTrials.filter(t =>
      queryTrialIds.has(t.nctId || t.title)
    );

    // Step 8: Rank each group
    const getSnippet = (abstract) => {
      if (!abstract) return '';
      const sentences = abstract.match(/[^.!?]+[.!?]+/g) || [];
      return sentences.slice(0, 2).join(' ').trim();
    };

    const topPublications = rankPublications(allPublications, expandedQuery, 8)
      .map(pub => ({
        ...pub,
      snippet: getSnippet(pub.abstract)
      }));
    const topDiseaseTrials = rankTrials(diseaseOnlyTrials, 4);
    const topQueryTrials = rankTrials(querySpecificTrials, 3);
    const topTrials = rankTrials(uniqueTrials, 6); // combined for LLM context

    console.log(`✅ Final — Publications: ${topPublications.length}, Disease Trials: ${topDiseaseTrials.length}, Query Trials: ${topQueryTrials.length}`);

    // Step 9: Generate LLM response
    const userMessage = additionalQuery || `Tell me about ${activeDisease}`;
    const llmResult = await generateMedicalResponse(
  activeDisease,
  userMessage,
  topPublications,
  topTrials,
  conversationHistory,
  patientName || conversation.patientName || ''
);

const llmResponse = llmResult.response || llmResult;
const followUpQuestions = llmResult.followUpQuestions || [];

    // Step 10: Save messages to MongoDB
    conversation.messages.push({ role: 'user', content: userMessage });
    conversation.messages.push({ role: 'assistant', content: llmResponse });
    conversation.disease = activeDisease;
    await conversation.save();

    console.log(`✅ Response generated and saved to MongoDB`);

    // Step 11: Return everything
    res.json({
      sessionId: currentSessionId,
      query: expandedQuery,
      disease: activeDisease,
      patientName: patientName || conversation.patientName || null,
      location: location || conversation.location || null,
      llmResponse,
      followUpQuestions,
      publications: topPublications,
      // Two separate trial arrays for frontend to display separately
      clinicalTrials: topDiseaseTrials,
      queryClinicalTrials: topQueryTrials,
      totalFetched: {
        pubmed: pubmedResults.length,
        openAlex: openAlexResults.length,
        clinicalTrials: uniqueTrials.length
      }
    });

  } catch (error) {
    console.error('❌ Research controller error:', error.message);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}

module.exports = { getResearch };