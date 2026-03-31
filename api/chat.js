export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { messages, max_tokens, temperature } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  const systemMsg = messages?.find(m => m.role === 'system');
  const chatMsgs = messages?.filter(m => m.role !== 'system') || [];

  const geminiBody = {
    contents: chatMsgs.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    })),
    generationConfig: { maxOutputTokens: max_tokens || 800, temperature: temperature || 0.7 }
  };
  if (systemMsg) geminiBody.systemInstruction = { parts: [{ text: systemMsg.content }] };

  const models = ['gemini-1.5-flash', 'gemini-1.5-flash-latest', 'gemini-1.0-pro', 'gemini-pro'];

  for (const model of models) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify(geminiBody)
      });
      const data = await response.json();
      if (!response.ok) continue;
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      return res.status(200).json({ choices: [{ message: { role: 'assistant', content: text } }] });
    } catch (e) { continue; }
  }

  res.status(500).json({ error: { message: 'All models failed' } });
}
