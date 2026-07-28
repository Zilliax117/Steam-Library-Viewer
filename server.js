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

// Parse games from Steam Community HTML page (doesn't require auth)
function parseGamesHtml(html) {
  const games = [];
  // Split by gameListRow to find each game block
  const blocks = html.split(/<div[^>]*class="[^"]*gameListRow[^"]*"[^>]*id="game_(\d+)"[^>]*>/gi);
  // blocks[0] is content before first game, then pairs of [appid, content, appid, content, ...]
  for (let i = 1; i < blocks.length; i += 2) {
    const appid = blocks[i];
    const content = blocks[i + 1] || '';
    // Find the end of this game row (next game row or closing structure)
    const rowEnd = content.search(/<div[^>]*class="[^"]*gameListRow[^"]*"/i);
    const rowContent = rowEnd > 0 ? content.substring(0, rowEnd) : content;

    // Extract game name from gameListRowItemName
    let name = 'Unknown Game';
    const nameFull = rowContent.match(/<div[^>]*class="[^"]*gameListRowItemName[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
    if (nameFull) {
      name = nameFull[1].replace(/<[^>]+>/g, '').trim();
    }

    // Extract hours from <h5>
    let hours = 0;
    const h5Match = rowContent.match(/<h5[^>]*>([\s\S]*?)<\/h5>/i);
    if (h5Match) {
      const hoursText = h5Match[1].replace(/<[^>]+>/g, '').trim();
      const hrsMatch = hoursText.match(/([\d,.]+)\s*hrs?/);
      if (hrsMatch) {
        hours = parseFloat(hrsMatch[1].replace(/,/g, ''));
      } else {
        const minMatch = hoursText.match(/([\d,.]+)\s*min/);
        if (minMatch) hours = parseFloat(minMatch[1].replace(/,/g, '')) / 60;
      }
    } else if (/gameListRowItemName/.test(rowContent)) {
      // Game exists but no <h5> found, log for debug
      console.log('No <h5> for appid', appid, 'name:', name, 'content-preview:', rowContent.substring(0, 200));
    }

    if (appid && name && name !== 'Unknown Game') {
      games.push({
        appid: parseInt(appid),
        name,
        playtime_minutes: Math.round(hours * 60),
        playtime_hours: parseFloat(hours.toFixed(1)),
        img_icon_url: `https://media.steampowered.com/steamcommunity/public/images/apps/${appid}/${appid}_icon.jpg`,
      });
    } else {
      console.log('Skipped:', appid, name, 'hours:', hours);
    }
  }
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
  // Profile via XML (works without auth)
  // Games via HTML page (works without auth for public profiles)
  const [profileRes, gamesRes] = await Promise.all([
    fetch(`https://steamcommunity.com/profiles/${steamId}/?xml=1`, { timeout: 8000 }),
    fetch(`https://steamcommunity.com/profiles/${steamId}/games?tab=all`, {
      timeout: 8000,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    }),
  ]);

  const profileXml = await profileRes.text();
  const gamesHtml = await gamesRes.text();

  // Check if games page requires login
  if (gamesHtml.includes('<title>Sign In</title>')) {
    return { error: '游戏详情不可见，请确认 Steam 隐私设置中"游戏详情"已设为公开' };
  }

  // Check if profile is private
  if (gamesHtml.includes('This profile is private')) {
    return { error: '该用户的游戏详情为私密，请在 Steam 隐私设置中设为公开' };
  }

  const playerName = xmlVal(profileXml, 'steamID') || xmlVal(profileXml, 'playerName') || 'Unknown';
  const avatarFull = xmlVal(profileXml, 'avatarFull');

  const games = parseGamesHtml(gamesHtml);
  // Filter out games with 0 playtime
  const playedGames = games.filter(g => g.playtime_minutes > 0);
  playedGames.sort((a, b) => b.playtime_minutes - a.playtime_minutes);

  // Count how many gameListRow divs are in the raw HTML
  const rawRowCount = (gamesHtml.match(/class="[^"]*gameListRow[^"]*"/gi) || []).length;

  return {
    player: {
      steamid: steamId,
      nickname: playerName,
      avatar: avatarFull,
      profileurl: `https://steamcommunity.com/profiles/${steamId}`,
    },
    total_games: playedGames.length,
    total_playtime_hours: parseFloat((playedGames.reduce((s, g) => s + g.playtime_minutes, 0) / 60).toFixed(1)),
    games: playedGames,
    _debug: {
      rawRowCount,
      parsedCount: games.length,
      playedCount: playedGames.length,
      appids: playedGames.map(g => g.appid),
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

  // Skip cache for debugging
  // const cached = cache.get(identifier);
  // if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
  //   return res.json(cached.data);
  // }

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

app.get('/api/debug/html/:identifier', async (req, res) => {
  const { identifier } = req.params;
  let steamId = identifier;
  if (!/^\d{17}$/.test(identifier)) {
    steamId = await resolveViaCommunity(identifier);
    if (!steamId) return res.status(404).json({ error: 'Cannot resolve' });
  }
  const r = await fetch(`https://steamcommunity.com/profiles/${steamId}/games?tab=all`, {
    timeout: 8000,
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
  });
  const html = await r.text();
  res.json({
    htmlLen: html.length,
    title: (html.match(/<title>([\s\S]*?)<\/title>/i) || [])[1] || 'no title',
    hasGameListRow: html.includes('gameListRow'),
    headPreview: html.substring(0, 1500),
    has_rgGames: html.includes('rgGames'),
    has_var: (html.match(/var\s+\w+\s*=/g) || []).slice(0, 20),
  });
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
