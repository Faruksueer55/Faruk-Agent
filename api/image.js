export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-pin');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const pin = req.headers['x-pin'];
  if (pin !== process.env.APP_PIN) return res.status(401).json({ error: 'Falscher PIN' });

  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) return res.status(500).json({ error: 'OPENAI_API_KEY nicht in Vercel gesetzt.' });

  const { prompt, size, styleHint } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Prompt fehlt' });

  // Style as prompt suffix (gpt-image-1 has no style parameter)
  let finalPrompt = prompt;
  if (styleHint === 'vivid') finalPrompt += ', vibrant colors, dramatic lighting, striking composition';
  if (styleHint === 'natural') finalPrompt += ', natural realistic look, soft authentic lighting';

  // Map sizes to gpt-image-1 supported values
  let imgSize = '1024x1024';
  if (size === '1792x1024' || size === '1536x1024') imgSize = '1536x1024';
  if (size === '1024x1792' || size === '1024x1536') imgSize = '1024x1536';

  try {
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + openaiKey
      },
      body: JSON.stringify({
        model: 'gpt-image-1',
        prompt: finalPrompt,
        n: 1,
        size: imgSize,
        quality: 'high'
      })
    });

    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data.error?.message || 'OpenAI Error' });

    const b64 = data.data?.[0]?.b64_json;
    if (!b64) return res.status(500).json({ error: 'Kein Bild in der Antwort' });

    return res.status(200).json({ b64: b64 });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
