export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-pin');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const pin = req.headers['x-pin'];
  if (pin !== process.env.APP_PIN) return res.status(401).json({ error: 'Falscher PIN' });

  const token = process.env.INSTAGRAM_TOKEN;
  const userId = process.env.INSTAGRAM_USER_ID;
  if (!token || !userId) return res.status(500).json({ error: 'Instagram nicht konfiguriert. Bitte INSTAGRAM_TOKEN und INSTAGRAM_USER_ID in Vercel setzen.' });

  try {
    const [profileR, mediaR] = await Promise.all([
      fetch(`https://graph.instagram.com/v21.0/${userId}?fields=id,username,followers_count,follows_count,media_count,biography,profile_picture_url&access_token=${token}`),
      fetch(`https://graph.instagram.com/v21.0/${userId}/media?fields=id,caption,media_type,media_url,thumbnail_url,timestamp,like_count,comments_count,permalink&limit=12&access_token=${token}`)
    ]);

    const [profile, media] = await Promise.all([profileR.json(), mediaR.json()]);

    if (profile.error) return res.status(400).json({ error: profile.error.message });

    return res.status(200).json({ profile, media });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
