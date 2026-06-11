export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-pin');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const pin = req.headers['x-pin'];
  if (pin !== process.env.APP_PIN) return res.status(401).json({ error: 'Falscher PIN' });

  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) return res.status(500).json({ error: 'OpenAI API Key nicht konfiguriert. Bitte OPENAI_API_KEY in Vercel Environment Variables setzen.' });

  const { prompt, size, style } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Prompt fehlt' });

  try {
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + openaiKey
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: prompt,
        n: 1,
        size: size || '1024x1024',
        style: style || 'vivid',
        quality: 'standard'
      })
    });

    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data.error?.message || 'OpenAI Error' });
    return res.status(200).json({ url: data.data[0].url, revised_prompt: data.data[0].revised_prompt });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
