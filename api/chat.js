export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = req.headers['x-api-key'];
  if (!apiKey) return res.status(401).json({ error: 'Kein API Key' });

  const { model, max_tokens, system, messages, useWebSearch } = req.body;

  // Build request body — add web search tool when requested
  const body = {
    model: model || 'claude-sonnet-4-6',
    max_tokens: max_tokens || 1500,
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

    // Extract all text blocks (web search may return multiple content blocks)
    const textBlocks = (data.content || [])
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('\n\n');

    return res.status(200).json({ text: textBlocks, raw: data });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
