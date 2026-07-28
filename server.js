require('dotenv').config();
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
  const [profileRes, gamesRes] = await Promise.all([
    fetch(`https://steamcommunity.com/profiles/${steamId}/?xml=1`, { timeout: 8000 }),
    fetch(`https://steamcommunity.com/profiles/${steamId}/games/?tab=all&xml=1`, { timeout: 8000 }),
  ]);

  const profileXml = await profileRes.text();
  const gamesXml = await gamesRes.text();

  if (gamesXml.includes('<error>')) {
    const errMsg = xmlVal(gamesXml, 'error') || '未知错误';
    if (errMsg.includes('not be retrieved') || errMsg.includes('private')) {
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
  };
}

// ---- Steam Web API approach (needs API key but api.steampowered.com is more reachable) ----

async function resolveViaApi(input) {
  if (/^\d{17}$/.test(input)) return input;

  try {
    const url = `https://api.steampowered.com/ISteamUser/ResolveVanityURL/v1/?key=${STEAM_API_KEY}&vanityurl=${encodeURIComponent(input)}`;
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

  try {
    const [gamesRes, profileRes] = await Promise.all([
      fetch(`https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${STEAM_API_KEY}&steamid=${steamId}&include_playtime=1&include_appinfo=1`),
      fetch(`https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${STEAM_API_KEY}&steamids=${steamId}`),
    ]);

    if (gamesRes.status === 403) return { error: 'invalid_key' };

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
    return { error: 'api_error' };
  }
}

// ---- Main route: tries API first if key is set, falls back to Community ----

app.get('/api/games/:identifier', async (req, res) => {
  const { identifier } = req.params;

  const cached = cache.get(identifier);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return res.json(cached.data);
  }

  const fail = (status, error, hint) => {
    res.status(status).json({ error, hint });
  };

  // Try Steam Web API first (faster, more reliable when key is available)
  if (STEAM_API_KEY) {
    try {
      const steamId = await resolveViaApi(identifier);
      if (!steamId) {
        return fail(404, '无法找到该用户，请检查输入的 Steam ID');
      }

      const result = await fetchViaApi(steamId);
      if (result.error === 'no_key' || result.error === 'invalid_key') {
        return fail(500,
          'Steam API Key 无效或未配置',
          '请确认 .env 文件中填写了有效的 API Key');
      }
      if (result.error === 'api_error') {
        // API failed (network), fall through to community
        console.log('Steam API unreachable, trying Community...');
      } else if (result.error) {
        return fail(404, result.error,
          '请在 Steam 隐私设置中将"游戏详情"设为公开');
      } else {
        cache.set(identifier, { data: result, timestamp: Date.now() });
        return res.json(result);
      }
    } catch (e) {
      console.log('Steam API error, trying Community...');
    }
  }

  // Fallback: Steam Community XML (no API key needed)
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
    }
  } catch (e) {
    console.log('Steam Community also unreachable');
  }

  // All sources failed
  return fail(500,
    '无法连接到 Steam 服务器',
    '当前网络环境无法访问 Steam API。如部署到 Render 等海外服务器即可正常使用。');
});

app.listen(PORT, () => {
  console.log(`Steam Library Viewer running at http://localhost:${PORT}`);
  if (!STEAM_API_KEY) {
    console.log('Note: No Steam API key set. Will try Steam Community first.');
    console.log('If blocked, get a key at https://steamcommunity.com/dev/apikey and put it in .env');
  }
});
