export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-pin');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const pin = req.headers['x-pin'];
  const correctPin = process.env.APP_PIN;
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!correctPin || !apiKey) return res.status(500).json({ error: 'Server nicht konfiguriert' });
  if (pin !== correctPin) return res.status(401).json({ error: 'Falscher PIN' });

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

  // Stream response for faster perceived speed
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

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
    if (!response.ok) {
      res.write(`data: ${JSON.stringify({ error: data.error?.message || 'API Error' })}\n\n`);
      res.end();
      return;
    }

    const textBlocks = (data.content || [])
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('\n\n');

    res.write(`data: ${JSON.stringify({ text: textBlocks, done: true })}\n\n`);
    res.end();
  } catch (error) {
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
}
