export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'OPENROUTER_API_KEY not set in Vercel env' });

  const { messages, max_tokens, temperature } = req.body || {};

  const models = [
    'google/gemini-2.0-flash-exp:free',
    'google/gemini-flash-1.5',
    'openai/gpt-4o-mini',
    'meta-llama/llama-3.1-8b-instruct:free'
  ];

  let lastError = {};
  for (const model of models) {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://talentscope-brown.vercel.app',
          'X-Title': 'TalentScope'
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: max_tokens || 800,
          temperature: temperature || 0.7
        })
      });
      const data = await response.json();
      if (!response.ok) {
        console.error(`Model ${model} failed:`, JSON.stringify(data));
        lastError = data;
        continue;
      }
      return res.status(200).json(data);
    } catch (e) {
      console.error(`Model ${model} exception:`, e.message);
      lastError = { message: e.message };
    }
  }
  res.status(500).json({ error: lastError });
}
