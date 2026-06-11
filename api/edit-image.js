export const config = {
  api: { bodyParser: { sizeLimit: '8mb' } }
};

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

  const { image, prompt, size } = req.body;
  if (!image || !prompt) return res.status(400).json({ error: 'Bild oder Prompt fehlt' });

  try {
    // Convert base64 to Blob and build multipart form
    const buffer = Buffer.from(image, 'base64');
    const blob = new Blob([buffer], { type: 'image/png' });
    const form = new FormData();
    form.append('model', 'gpt-image-1');
    form.append('image', blob, 'image.png');
    form.append('prompt', prompt);
    form.append('size', size || '1024x1024');
    form.append('quality', 'medium');

    const response = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + openaiKey },
      body: form
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || 'OpenAI Error' });
    }

    // gpt-image-1 returns base64
    const b64 = data.data?.[0]?.b64_json;
    if (!b64) return res.status(500).json({ error: 'Kein Bild in der Antwort' });

    return res.status(200).json({ b64: b64 });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
