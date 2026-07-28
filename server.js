try { require('dotenv').config(); } catch (e) { /* no .env file on deployed server */ }
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const STEAM_API_KEY = process.env.STEAM_API_KEY || '';

// In-memory cache: 10 minutes TTL
const cache = new Map();
const CACHE_TTL = 10 * 60 * 1000;

app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// ---- Steam Community XML approach (no API key required) ----

function xmlVal(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}><!\\[CDATA\\[(.*?)\\]\\]></${tag}>`, 's'));
  if (m) return m[1];
  const m2 = xml.match(new RegExp(`<${tag}>(.*?)</${tag}>`, 's'));
  return m2 ? m2[1] : null;
}

function parseGamesXml(xml) {
  const games = [];
  const gameBlocks = xml.split('<game>').slice(1);
  console.log('parseGamesXml: found', gameBlocks.length, 'game blocks');
  for (const block of gameBlocks) {
    const appid = xmlVal(block, 'appID');
    const name = xmlVal(block, 'name');
    const logo = xmlVal(block, 'logo');
    const hoursOnRecord = parseFloat(xmlVal(block, 'hoursOnRecord') || '0');
    if (appid && name) {
      games.push({
        appid: parseInt(appid),
        name,
        playtime_minutes: Math.round(hoursOnRecord * 60),
        playtime_hours: parseFloat(hoursOnRecord.toFixed(1)),
        img_icon_url: logo
          ? `https://media.steampowered.com/steamcommunity/public/images/apps/${appid}/${logo}.jpg`
          : null,
      });
    } else {
      console.log('Skipped game block - appid:', appid, 'name:', name);
    }
  }
  console.log('parseGamesXml: parsed', games.length, 'games');
  return games;
}

async function resolveViaCommunity(input) {
  if (/^\d{17}$/.test(input)) return input;

  const timeout = { timeout: 5000 };

  try {
    const url = `https://steamcommunity.com/id/${encodeURIComponent(input)}/?xml=1`;
    const res = await fetch(url, timeout);
    const xml = await res.text();
    const steamId64 = xmlVal(xml, 'steamID64');
    if (steamId64 && /^\d{17}$/.test(steamId64)) return steamId64;
  } catch (e) { /* fall through */ }

  if (/^\d+$/.test(input)) {
    try {
      const url = `https://steamcommunity.com/profiles/${input}/?xml=1`;
      const res = await fetch(url, timeout);
      const xml = await res.text();
      const steamId64 = xmlVal(xml, 'steamID64');
      if (steamId64) return steamId64;
    } catch (e) { /* fall through */ }
  }

  return null;
}

async function fetchViaCommunity(steamId) {
  const [profileRes, gamesRes] = await Promise.all([
    fetch(`https://steamcommunity.com/profiles/${steamId}/?xml=1`, { timeout: 8000 }),
    fetch(`https://steamcommunity.com/profiles/${steamId}/games/?tab=all&xml=1`, { timeout: 8000 }),
  ]);

  const profileXml = await profileRes.text();
  const gamesXml = await gamesRes.text();

  // Debug: log response status and sample
  console.log('Profile status:', profileRes.status);
  console.log('Games status:', gamesRes.status, 'length:', gamesXml.length);
  console.log('Games XML preview:', gamesXml.substring(0, 500));

  if (gamesXml.includes('<error>')) {
    const errMsg = xmlVal(gamesXml, 'error') || '未知错误';
    console.log('Games XML error:', errMsg);
    if (errMsg.includes('not be retrieved') || errMsg.includes('private') || errMsg.includes('friends')) {
      return { error: '该用户的游戏详情为私密，请在 Steam 隐私设置中设为公开' };
    }
    return { error: errMsg };
  }

  const playerName = xmlVal(profileXml, 'steamID') || xmlVal(profileXml, 'playerName') || 'Unknown';
  const avatarFull = xmlVal(profileXml, 'avatarFull');

  const games = parseGamesXml(gamesXml);
  games.sort((a, b) => b.playtime_minutes - a.playtime_minutes);

  return {
    player: {
      steamid: steamId,
      nickname: playerName,
      avatar: avatarFull,
      profileurl: `https://steamcommunity.com/profiles/${steamId}`,
    },
    total_games: games.length,
    total_playtime_hours: parseFloat((games.reduce((s, g) => s + g.playtime_minutes, 0) / 60).toFixed(1)),
    games,
    _debug: {
      source: 'community',
      gamesXmlLen: gamesXml.length,
      xmlPreview: gamesXml.substring(0, 400),
    },
  };
}

// ---- Steam Web API approach (needs API key but api.steampowered.com is more reachable) ----

async function resolveViaApi(input) {
  if (/^\d{17}$/.test(input)) return input;

  try {
    const url = `https://api.steampowered.com/ISteamUser/ResolveVanityURL/v0001/?key=${STEAM_API_KEY}&vanityurl=${encodeURIComponent(input)}&format=json`;
    const res = await fetch(url, { timeout: 5000 });
    const data = await res.json();
    if (data.response && data.response.success === 1) return data.response.steamid;
  } catch (e) { /* fall through */ }

  if (/^\d+$/.test(input)) return input;

  return null;
}

async function fetchViaApi(steamId) {
  if (!STEAM_API_KEY) {
    return { error: 'no_key' };
  }

  const TIMEOUT = 15000;

  try {
    const [gamesRes, profileRes] = await Promise.all([
      fetch(`https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${STEAM_API_KEY}&steamid=${steamId}&include_playtime=1&include_appinfo=1&format=json`, { timeout: TIMEOUT }),
      fetch(`https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${STEAM_API_KEY}&steamids=${steamId}&format=json`, { timeout: TIMEOUT }),
    ]);

    if (gamesRes.status === 403) return { error: 'invalid_key' };
    if (!gamesRes.ok) return { error: `api_http_${gamesRes.status}`, detail: await gamesRes.text().catch(() => '') };

    const gamesData = await gamesRes.json();
    const profileData = await profileRes.json();

    if (!gamesData.response || !gamesData.response.games) {
      return { error: '该用户的游戏详情为私密，请在 Steam 隐私设置中设为公开' };
    }

    const player = profileData.response?.players?.[0] || {};

    const games = gamesData.response.games
      .map((g) => ({
        appid: g.appid,
        name: g.name || 'Unknown Game',
        playtime_minutes: g.playtime_forever || 0,
        playtime_hours: parseFloat(((g.playtime_forever || 0) / 60).toFixed(1)),
        img_icon_url: g.img_icon_url
          ? `https://media.steampowered.com/steamcommunity/public/images/apps/${g.appid}/${g.img_icon_url}.jpg`
          : null,
      }))
      .sort((a, b) => b.playtime_minutes - a.playtime_minutes);

    return {
      player: {
        steamid: steamId,
        nickname: player.personaname || 'Unknown',
        avatar: player.avatarfull || null,
        profileurl: player.profileurl || `https://steamcommunity.com/profiles/${steamId}`,
      },
      total_games: games.length,
      total_playtime_hours: parseFloat((games.reduce((s, g) => s + g.playtime_minutes, 0) / 60).toFixed(1)),
      games,
    };
  } catch (e) {
    console.error('fetchViaApi error:', e.message);
    return { error: 'api_error', detail: e.message };
  }
}

// ---- Main route: Community first (most reliable from Render), API as fallback ----

app.get('/api/games/:identifier', async (req, res) => {
  const { identifier } = req.params;

  const cached = cache.get(identifier);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return res.json(cached.data);
  }

  const fail = (status, error, hint) => {
    res.status(status).json({ error, hint });
  };

  // Primary: Steam Community XML (reachable from Render, no API key needed)
  try {
    const steamId = await resolveViaCommunity(identifier);
    if (steamId) {
      const result = await fetchViaCommunity(steamId);
      if (!result.error) {
        cache.set(identifier, { data: result, timestamp: Date.now() });
        return res.json(result);
      }
      if (result.error.includes('私密')) {
        return fail(404, result.error,
          '请在 Steam 隐私设置中将"游戏详情"设为公开');
      }
    } else {
      return fail(404, '无法找到该用户，请检查输入的 Steam ID 或自定义 URL');
    }
  } catch (e) {
    console.log('Steam Community error:', e.message);
  }

  // Fallback: Steam Web API
  if (!STEAM_API_KEY) {
    return fail(500, '无法获取游戏数据，请稍后重试');
  }

  try {
    const steamId = await resolveViaApi(identifier);
    if (!steamId) {
      return fail(404, '无法找到该用户，请检查输入的 Steam ID');
    }

    const result = await fetchViaApi(steamId);
    if (!result.error) {
      cache.set(identifier, { data: result, timestamp: Date.now() });
      return res.json(result);
    }
    if (result.error.includes('私密')) {
      return fail(404, result.error,
        '请在 Steam 隐私设置中将"游戏详情"设为公开');
    }
    return fail(500, '获取数据失败，请稍后重试');
  } catch (e) {
    console.error('API fallback error:', e.message);
    return fail(500, '无法连接到 Steam，请稍后重试');
  }
});

app.get('/api/health', async (req, res) => {
  const status = {
    apiKeyConfigured: !!STEAM_API_KEY,
    apiKeyLength: STEAM_API_KEY.length,
    steamApiReachable: false,
    steamCommunityReachable: false,
  };

  try {
    const r = await fetch('https://api.steampowered.com/ISteamApps/GetAppList/v2/', { timeout: 8000 });
    status.steamApiReachable = r.ok;
  } catch (e) {
    status.steamApiReachable = false;
    status.steamApiError = e.message;
  }

  try {
    const r = await fetch('https://steamcommunity.com/', { timeout: 8000 });
    status.steamCommunityReachable = r.ok;
  } catch (e) {
    status.steamCommunityReachable = false;
  }

  res.json(status);
});

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
});

app.listen(PORT, () => {
  console.log(`Steam Library Viewer running on port ${PORT}`);
  console.log(`API key configured: ${!!STEAM_API_KEY} (length: ${STEAM_API_KEY.length})`);
});
