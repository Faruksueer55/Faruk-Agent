export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-pin');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate'); // Cache 5 min

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const pin = req.headers['x-pin'];
  if (pin !== process.env.APP_PIN) return res.status(401).json({ error: 'Falscher PIN' });

  const token = process.env.INSTAGRAM_TOKEN;
  const userId = process.env.INSTAGRAM_USER_ID;
  if (!token || !userId) return res.status(500).json({ error: 'Instagram nicht konfiguriert' });

  const { type } = req.body;

  try {
    if (type === 'all') {
      // Parallel fetch for speed
      const [profileR, mediaR] = await Promise.all([
        fetch(`https://graph.instagram.com/v21.0/${userId}?fields=id,username,followers_count,follows_count,media_count,biography,profile_picture_url,website&access_token=${token}`),
        fetch(`https://graph.instagram.com/v21.0/${userId}/media?fields=id,caption,media_type,media_url,thumbnail_url,timestamp,like_count,comments_count,permalink&limit=12&access_token=${token}`)
      ]);

      const [profile, media] = await Promise.all([profileR.json(), mediaR.json()]);

      // For each video, get a playable URL
      let mediaData = media.data || [];

      return res.status(200).json({ profile, media: { data: mediaData } });
    }

    if (type === 'video') {
      // Get specific video details with video_url
      const { mediaId } = req.body;
      const r = await fetch(
        `https://graph.instagram.com/v21.0/${mediaId}?fields=id,media_type,media_url,thumbnail_url,timestamp,like_count,comments_count&access_token=${token}`
      );
      return res.status(200).json(await r.json());
    }

    if (type === 'stories') {
      const r = await fetch(
        `https://graph.instagram.com/v21.0/${userId}/stories?fields=id,media_type,media_url,thumbnail_url,timestamp&access_token=${token}`
      );
      return res.status(200).json(await r.json());
    }

    return res.status(400).json({ error: 'Unknown type' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
