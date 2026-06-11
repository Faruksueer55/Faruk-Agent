export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-pin');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // PIN check
  const pin = req.headers['x-pin'];
  const correctPin = process.env.APP_PIN;
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!correctPin || !apiKey) {
    return res.status(500).json({ error: 'Server nicht konfiguriert. Bitte Environment Variables setzen.' });
  }

  if (pin !== correctPin) {
    return res.status(401).json({ error: 'Falscher PIN' });
  }

  const { model, max_tokens, system, messages, useWebSearch } = req.body;

  const body = {
    model: model || 'claude-sonnet-4-6',
    max_tokens: max_tokens || 2000,
    system,
    messages
  };

  if (useWebSearch) {
    body.tools = [{ type: 'web_search_20250305', name: 'web_search' }];
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    if (!response.ok) return res.status(response.status).json(data);

    const textBlocks = (data.content || [])
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('\n\n');

    return res.status(200).json({ text: textBlocks, raw: data });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
