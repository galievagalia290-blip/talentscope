export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY not set in Vercel env' });

  if (req.method === 'GET') {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    return res.status(r.status).json(await r.json());
  }

  const { messages, max_tokens, temperature } = req.body;
  const systemMsg = messages?.find(m => m.role === 'system');
  const chatMsgs = messages?.filter(m => m.role !== 'system') || [];
  const geminiBody = {
    contents: chatMsgs.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
    generationConfig: { maxOutputTokens: max_tokens || 800, temperature: temperature || 0.7 }
  };
  if (systemMsg) geminiBody.systemInstruction = { parts: [{ text: systemMsg.content }] };

  const models = ['gemini-1.5-flash', 'gemini-1.5-flash-latest', 'gemini-1.0-pro', 'gemini-pro'];
  let lastError = {};
  for (const model of models) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify(geminiBody)
      });
      const data = await response.json();
      if (!response.ok) { lastError = data; continue; }
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      return res.status(200).json({ choices: [{ message: { role: 'assistant', content: text } }] });
    } catch (e) { lastError = { message: e.message }; }
  }
  res.status(500).json({ error: lastError });
}
