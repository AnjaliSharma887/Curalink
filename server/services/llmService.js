const axios = require('axios');

async function generateMedicalResponse(disease, query, publications, clinicalTrials, conversationHistory = [], patientName = '') {
  try {
    console.log('🤖 Sending to Groq LLM...');

    const pubContext = publications.slice(0, 5).map((pub, i) => `
[${i + 1}] Title: ${pub.title}
Authors: ${pub.authors?.slice(0,2).join(', ') || 'Unknown'}
Year: ${pub.year} | Source: ${pub.source}
Key Finding: ${pub.abstract?.substring(0, 300) || 'No abstract'}
URL: ${pub.url}
`).join('\n');

    const trialsContext = clinicalTrials.slice(0, 3).map((trial, i) => `
[T${i + 1}] ${trial.title}
Status: ${trial.status} | Location: ${trial.locations}
Description: ${trial.description?.substring(0, 200) || 'No description'}
`).join('\n');

    const historyContext = conversationHistory.length > 0
      ? `Previous conversation:\n${conversationHistory.slice(-4).map(m => `${m.role}: ${m.content}`).join('\n')}\n`
      : '';

    const systemPrompt = `You are Curalink, an expert AI medical research assistant. You communicate like a knowledgeable senior physician explaining to a patient. You write in clear, flowing paragraphs — never dry bullet points. You bold important medical terms, include specific statistics, and cite sources inline like [1] or [2].
                          ${patientName ? `The patient's name is ${patientName}. Refer to them personally when appropriate, e.g. "For you ${patientName}..." or "As a ${disease} patient ${patientName}..."` : ''}`;
    const userPrompt = `${historyContext}
Disease/Condition: ${disease}
User Question: ${query}

RESEARCH PUBLICATIONS:
${pubContext}

CLINICAL TRIALS:
${trialsContext}

Write a comprehensive response in this exact structure:

## Direct Answer: ${query}
[Start by DIRECTLY answering "${query}" in 2-3 sentences with specific facts. Then provide supporting context about ${disease}. Do NOT give a generic disease overview — answer what was specifically asked FIRST. Bold key medical terms. Cite sources like [1][2].]

FOCUS REQUIREMENT: The user is specifically asking about "${query}". 
The "What the Research Shows" section MUST directly address this specific topic.
Do not discuss unrelated treatments. Stay focused on what was asked.

## Direct Answer to: "${query}"
[Start by DIRECTLY answering the question in 2-3 sentences. Then provide supporting context about ${disease}. Do not give a generic disease overview — answer what was specifically asked first.]

## What the Research Shows
Write 3-4 flowing paragraphs synthesizing key findings from the publications. Each paragraph covers one theme. Use specific numbers and percentages from studies. Every paragraph must connect back to the specific question asked. Bold key drug names and procedures. Cite every claim with [1][2] etc.

## Clinical Trials
Write 1-2 paragraphs about the most relevant trials. Include trial name, status, location, what it's investigating.

## Key Takeaways for ${disease} Patients
Write 2-3 warm, direct sentences answering "${query}". Tell them what to discuss with their doctor.

## Sources
[Numbered list, keep each source on ONE line: 
1. Title [Authors] (Year) - URL
Maximum 6 sources. Keep titles short. Never truncate mid-sentence.]

Rules: Flowing paragraphs only. Bold key terms. Cite every claim. Be specific with numbers. Always relate to ${disease}.
For each citation [1][2] etc, after citing include a brief supporting quote in quotes showing WHY you cited that source, like: "...as shown in studies [1] where researchers found that..."`;

    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 1500
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    const generatedText = response.data.choices[0]?.message?.content;

    if (!generatedText) {
      throw new Error('No response from Groq');
    }

    console.log('✅ LLM response generated successfully');

// Generate follow-up questions separately
const followUpResponse = await axios.post(
  'https://api.groq.com/openai/v1/chat/completions',
  {
    model: 'llama-3.1-8b-instant',
    messages: [
      {
        role: 'system',
        content: 'You are a medical research assistant. Generate exactly 3 short, specific follow-up questions. Return ONLY a JSON array of 3 strings. No explanation, no markdown, just the JSON array.'
      },
      {
  role: 'user',
  content: `Patient has ${disease} and just asked: "${query}".
  
Generate 3 follow-up questions that a patient would naturally ask next:
- Question 1: Directly related to "${query}" and ${disease}
- Question 2: About broader ${disease} treatment or management  
- Question 3: A practical/lifestyle question for ${disease} patients

Return only: ["question1", "question2", "question3"]`
}
    ],
    temperature: 0.7,
    max_tokens: 200
  },
  {
    headers: {
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json'
    },
    timeout: 15000
  }
);

let followUpQuestions = [];
try {
  const followUpText = followUpResponse.data.choices[0]?.message?.content || '[]';
  const cleaned = followUpText.replace(/```json|```/g, '').trim();
  followUpQuestions = JSON.parse(cleaned);
} catch (e) {
  followUpQuestions = [
    `What are the side effects of treatments for ${disease}?`,
    `Are there clinical trials available for ${disease}?`,
    `What lifestyle changes help with ${disease}?`
  ];
}

return { response: generatedText, followUpQuestions };

  } catch (error) {
    console.error('❌ LLM error:', error.message);
    return generateFallbackResponse(disease, query, publications, clinicalTrials);
  }
}

function generateFallbackResponse(disease, query, publications, clinicalTrials) {
  const topPubs = publications.slice(0, 5);
  const topTrials = clinicalTrials.slice(0, 3);

  return `## Overview of ${disease}

${disease} is an active area of medical research with significant ongoing investigations into new treatments and interventions. The following insights are drawn from recent peer-reviewed publications.

## What the Research Shows

${topPubs.map((pub, i) => `**[${i + 1}] ${pub.title}** (${pub.year}, ${pub.source})\n${pub.abstract?.substring(0, 400) || 'See full publication for details'}`).join('\n\n')}

## Clinical Trials

${topTrials.length > 0
    ? topTrials.map(trial => `**${trial.title}** is currently **${trial.status}** in ${trial.locations}. ${trial.description?.substring(0, 200) || ''}`).join('\n\n')
    : 'No active clinical trials found for this query.'}

## Key Takeaways

Based on current research, ${disease} has multiple treatment approaches being actively studied. Discuss these findings with your healthcare provider to understand which options may be appropriate for your situation.

## Sources
${topPubs.map((pub, i) => `${i + 1}. ${pub.title} — ${pub.authors?.[0] || 'Unknown'} — ${pub.year} — ${pub.url}`).join('\n')}`;
}

module.exports = { generateMedicalResponse };