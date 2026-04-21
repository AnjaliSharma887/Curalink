const axios = require('axios');

async function fetchClinicalTrials(disease, query, maxResults = 50, location = '') {
  try {
    console.log(`🔍 Fetching ClinicalTrials for: ${disease}`);

    const response = await axios.get('https://clinicaltrials.gov/api/v2/studies', {
      params: {
        'query.cond': disease,
        'query.term': query,
        'query.locn': location || '',
        'filter.overallStatus': 'RECRUITING,COMPLETED,ACTIVE_NOT_RECRUITING',
        pageSize: maxResults,
        format: 'json'
      }
    });

    const studies = response.data.studies || [];
    console.log(`✅ ClinicalTrials found ${studies.length} studies`);

    const trials = studies.map(study => {
      const protocol = study.protocolSection || {};
      const identification = protocol.identificationModule || {};
      const status = protocol.statusModule || {};
      const description = protocol.descriptionModule || {};
      const eligibility = protocol.eligibilityModule || {};
      const contacts = protocol.contactsLocationsModule || {};

      // Get location
      const locations = (contacts.locations || []).slice(0, 2).map(loc =>
        `${loc.city || ''}, ${loc.country || ''}`.trim()
      );

      // Get contact info
      const centralContacts = contacts.centralContacts || [];
      const contactInfo = centralContacts[0]
        ? `${centralContacts[0].name || ''} - ${centralContacts[0].phone || centralContacts[0].email || 'N/A'}`
        : 'Not provided';

      return {
        title: identification.briefTitle || 'No title',
        status: status.overallStatus || 'Unknown',
        description: description.briefSummary?.substring(0, 400) || 'No description',
        eligibility: eligibility.eligibilityCriteria
          ?.replace(/\\n/g, ' ')
          ?.replace(/\n/g, ' ')
          ?.substring(0, 400) || 'See full listing',
        locations: locations.join(' | ') || 'Not specified',
        contact: contactInfo,
        nctId: identification.nctId || null,
        url: identification.nctId
          ? `https://clinicaltrials.gov/study/${identification.nctId}`
          : null,
        startDate: status.startDateStruct?.date || 'Unknown'
      };
    });

    return trials;

  } catch (error) {
    console.error('❌ ClinicalTrials error:', error.message);
    return [];
  }
}

module.exports = { fetchClinicalTrials };