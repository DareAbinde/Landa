// netlify/functions/generate-profile.js
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { answers, score } = body;
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'API key not configured' }) };
  }

  const cityLabels = { A: 'major city', AB: 'university city near a major centre', B: 'mid-sized city', C: 'smaller university town', other: 'unlisted city' };
  const courseLabels = { A: 'high demand', B: 'moderate demand', C: 'limited demand' };
  const tuitionLabels = { full: 'full tuition covered', '3of4': '3 of 4 semesters available', '2of4': '2 of 4 semesters available', '1of4': '1 of 4 semesters available', '1of2': '1 of 2 semesters available' };
  const langLabels = { already: 'already learning Swedish', immediate: 'plan to start immediately upon arrival', unsure: 'unsure, may learn eventually but not an immediate priority', no: 'no intention to learn Swedish' };
  const livingLabels = { '12plus': '12+ months of living costs saved', '6': 'up to 6 months saved', '3': 'up to 3 months saved', 'less3': 'less than 3 months saved' };
  const partnerLabels = { working: 'partner coming and willing to work', alone: 'coming alone', notworking: 'partner coming but not working' };
  const convLabels = { certain: 'completely certain', fairly: 'fairly confident with some unresolved doubts', uncertain: 'uncertain' };

  const systemPrompt = `You are a knowledgeable, warm, and honest consultant with deep experience helping international (mostly Africans/Non-EU) students move to Sweden. You speak plainly and humanly, addressing the user directly as "you" and never in the third person. You write in flowing, natural prose. Strictly avoid bullet points and em-dashes (—).

IDENTITY & SCOPE: Do not assume or mention the user's country of origin. Never any specific nation.

TUITION & LEGAL BASELINE: When you see "X of Y semesters available," evaluate the ratio. Regardless of Y, treat X=1 as the mandatory legal minimum required for a residence permit—frame it as the "entry requirement" baseline rather than a financial advantage or a strength (never treat it as a strength). Only when X is greater than 1 or the ratio X/Y is greater than or equal to 0.5 should you shift to a more positive tone regarding a "financial foundation". Always refer to secured funds as "secured funding" or "allocated resources" and never use the terms "scholarship," "award," "grant," or "savings." Calculate the remaining Y minus X semesters as a funding gap that requires a strategic and clear plan, which you must address in your recommendation.

BUFFER CALIBRATION: Be realistic about savings. 3 months is a "modest buffer" with little margin for error. 6 months is "solid". 12+ months is "truly secure". Avoid overstating the adequacy of short-term runway. No legality is applied here. You are simply advising based on the reality of living costs.

ADMINISTRATIVE & WORK REALITY: Accompanying partners are legally allowed to work, but finding a job immediately is never guaranteed. When discussing delays or friction, do not mention visa delays. You may focus instead on the actual internal bottlenecks, like the Skatteverket queue for a Personnummer, the subsequent difficulty of opening a Swedish bank account, and simply the reality that finding stable employment takes time. Treat the "secured" funding as a foundation and any "unsecured" gap as a strategic priority for their journey.

By law, students' weekly work hours are currently not capped, although their academic commitments will influence how much time they are actually able to commit to work without affecting their studies. There's a new policy change under deliberation on capping the hours to 15 per week; while implementation is still uncertain or unclear, they should keep an eye on it. 

LANGUAGE: Alongside any other recommended steps for learning Swedish, you can include SFI (Swedish for Immigrants).

Finally, note that the user MAY still be deciding on whether to accept their admission and move to Sweden or not, and your advice may be particularly decisive for such a candidate who is trying to know if they are a fit for the country. You shouldn't assume that a candidate has conclusively decided on making the move.`;

  const userPrompt = `A candidate has just completed a Sweden readiness assessment. Their profile is:

- Programme: ${answers.programme === '2yr' ? '2 year Master\'s' : '1 year Master\'s'}
- Tuition situation: ${tuitionLabels[answers.tuition] || 'not provided'}
- Swedish language openness: ${langLabels[answers.language] || 'not provided'}
- Study city: ${cityLabels[answers.city] || 'not provided'}
- Living cost buffer: ${livingLabels[answers.living] || 'not provided'}
- Course field: ${courseLabels[answers.course] || 'not provided'}
- Partner situation: ${partnerLabels[answers.partner] || 'not provided'}
- Conviction about the move: ${convLabels[answers.conviction] || 'not provided'}

Their overall score is ${score} out of 100, meaning their profile shows a ${score}% alignment with the realities of settling in well in Sweden.

Write a personalised profile for this candidate with exactly four sections. Keep each section concise and sharp. Do not pad. Write as a consultant would speak to someone across a table.

STRENGTHS
Write 1 to 2 short paragraphs covering the dimensions where this candidate is well positioned. Connect each strength to its real-world implication in Sweden. Be specific. Do not be generic or flattering for its own sake.

AREAS OF RISK
Write 1 to 2 short paragraphs addressing the dimensions where this candidate is exposed. Be honest but not discouraging. Where relevant, acknowledge the working partner situation factually and sensitively without making a recommendation about it. Do not tell them to change their personal situation.

RECOMMENDATIONS
Write 1 to 2 short paragraphs of specific, practical actions tied directly to the risk areas. Skip the working partner dimension here. Be actionable. Reference real Swedish programmes or resources where relevant.

IN CLOSING
Write one short paragraph that grounds the profile as a moment-in-time reflection, not a verdict. Remind the candidate that readiness is not fixed.

Format your response exactly as:
STRENGTHS
[text]

AREAS OF RISK
[text]

RECOMMENDATIONS
[text]

IN CLOSING
[text]`;


  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.SITE_URL,
        'X-Title': 'Landa Mobility Intelligence'
      },
      body: JSON.stringify({
        model: 'anthropic/claude-haiku-4.5',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.75,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('OpenRouter error:', error);
      return { statusCode: response.status, body: JSON.stringify({ error: error.error?.message || 'API error' }) };
    }

    const data = await response.json();
    console.log("Full AI Response:", JSON.stringify(data, null, 2));
    const text = data.choices?.[0]?.message?.content || '';

    const sections = parseProfile(text);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" }, // This fixes the <binary data> issue
      body: JSON.stringify(sections)
    };

  } catch (err) {
    console.error('Error:', err);
    return { 
      statusCode: 500, 
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: err.message }) 
    };
  }
};

function parseProfile(text) {
  const sections = { strengths: '', risks: '', recs: '', closing: '' };
  
  if (!text || typeof text !== 'string') {
    return sections;
  }

  const lines = text.split('\n');
  let currentSection = 'strengths'; 
  let currentContent = [];
  
  for (let line of lines) {
    const trimmed = line.trim();
    const upperTrimmed = trimmed.toUpperCase();
    
    // Header Detection (Max 30 chars to avoid catching sentences)
    if (upperTrimmed.includes('STRENGTHS') && !upperTrimmed.includes('AREAS') && upperTrimmed.length < 30) {
      if (currentSection && currentContent.length) {
        sections[currentSection] = currentContent.join('\n').trim();
      }
      currentSection = 'strengths';
      currentContent = [];
    } 
    else if ((upperTrimmed.includes('AREAS OF RISK') || (upperTrimmed.includes('AREAS') && upperTrimmed.includes('RISK'))) && upperTrimmed.length < 30) {
      if (currentSection && currentContent.length) {
        sections[currentSection] = currentContent.join('\n').trim();
      }
      currentSection = 'risks';
      currentContent = [];
    } 
    else if ((upperTrimmed.includes('RECOMMENDATIONS') || upperTrimmed.includes('RECOMMENDATION')) && upperTrimmed.length < 30) {
      if (currentSection && currentContent.length) {
        sections[currentSection] = currentContent.join('\n').trim();
      }
      currentSection = 'recs';
      currentContent = [];
    } 
    else if ((upperTrimmed.includes('IN CLOSING') || upperTrimmed.includes('CLOSING')) && upperTrimmed.length < 30) {
      if (currentSection && currentContent.length) {
        sections[currentSection] = currentContent.join('\n').trim();
      }
      currentSection = 'closing';
      currentContent = [];
    } 
    else if (currentSection) {
      // FIX: Preserve empty lines for paragraph spacing by pushing the raw line
      currentContent.push(line);
    }
  }
  
  // Final push for the last section
  if (currentSection && currentContent.length) {
    sections[currentSection] = currentContent.join('\n').trim();
  }
  
  return sections;
}
