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

  if (!token || !userId) return res.status(500).json({ error: 'Instagram nicht konfiguriert' });

  const { type } = req.body;

  try {
    let data = {};

    if (type === 'profile') {
      const r = await fetch(
        `https://graph.instagram.com/v21.0/${userId}?fields=id,username,followers_count,follows_count,media_count,profile_picture_url,biography,website&access_token=${token}`
      );
      data.profile = await r.json();
    }

    if (type === 'media') {
      const r = await fetch(
        `https://graph.instagram.com/v21.0/${userId}/media?fields=id,caption,media_type,media_url,thumbnail_url,timestamp,like_count,comments_count,insights.metric(reach,impressions,saved,shares)&limit=12&access_token=${token}`
      );
      data.media = await r.json();
    }

    if (type === 'insights') {
      const r = await fetch(
        `https://graph.instagram.com/v21.0/${userId}/insights?metric=follower_count,impressions,reach,profile_views&period=day&since=${Math.floor(Date.now()/1000) - 7*86400}&until=${Math.floor(Date.now()/1000)}&access_token=${token}`
      );
      data.insights = await r.json();
    }

    if (type === 'all') {
      const [profileR, mediaR] = await Promise.all([
        fetch(`https://graph.instagram.com/v21.0/${userId}?fields=id,username,followers_count,follows_count,media_count,biography&access_token=${token}`),
        fetch(`https://graph.instagram.com/v21.0/${userId}/media?fields=id,caption,media_type,media_url,thumbnail_url,timestamp,like_count,comments_count&limit=9&access_token=${token}`)
      ]);
      data.profile = await profileR.json();
      data.media = await mediaR.json();
    }

    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
