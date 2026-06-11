export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-pin');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const pin = req.headers['x-pin'];
  if (pin !== process.env.APP_PIN) return res.status(401).json({ error: 'Falscher PIN' });

  const key = process.env.OPENAI_API_KEY;
  if (!key) return res.status(500).json({ error: 'OPENAI_API_KEY nicht in Vercel gesetzt.' });

  const { action, prompt, seconds, size, id } = req.body;

  try {
    // 1. Video-Job erstellen
    if (action === 'create') {
      const r = await fetch('https://api.openai.com/v1/videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
        body: JSON.stringify({
          model: 'sora-2',
          prompt: prompt,
          seconds: seconds || '4',
          size: size || '720x1280'
        })
      });
      const data = await r.json();
      if (!r.ok) return res.status(r.status).json({ error: data.error?.message || 'Sora Error' });
      return res.status(200).json({ id: data.id, status: data.status });
    }

    // 2. Status abfragen
    if (action === 'status') {
      const r = await fetch('https://api.openai.com/v1/videos/' + id, {
        headers: { 'Authorization': 'Bearer ' + key }
      });
      const data = await r.json();
      if (!r.ok) return res.status(r.status).json({ error: data.error?.message || 'Status Error' });
      return res.status(200).json({
        status: data.status,
        progress: data.progress || 0,
        error: data.error ? data.error.message : null
      });
    }

    // 3. Fertiges Video abrufen (binary stream)
    if (action === 'content') {
      const r = await fetch('https://api.openai.com/v1/videos/' + id + '/content', {
        headers: { 'Authorization': 'Bearer ' + key }
      });
      if (!r.ok) return res.status(r.status).json({ error: 'Video nicht abrufbar' });
      const buf = Buffer.from(await r.arrayBuffer());
      res.setHeader('Content-Type', 'video/mp4');
      return res.status(200).send(buf);
    }

    return res.status(400).json({ error: 'Unbekannte Aktion' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
