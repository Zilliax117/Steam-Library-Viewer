// ============================================
// Steam Library Viewer — Interactive Scripts
// ============================================

// ---- DOM Elements ----
const steamInput = document.getElementById('steamInput');
const searchBtn = document.getElementById('searchBtn');
const heroSection = document.getElementById('hero');
const loadingSection = document.getElementById('loading');
const errorSection = document.getElementById('error');
const resultsSection = document.getElementById('results');
const errorMsg = document.getElementById('errorMsg');
const errorHint = document.getElementById('errorHint');
const gamesList = document.getElementById('gamesList');
const profileCard = document.getElementById('profileCard');
const profileAvatar = document.getElementById('profileAvatar');
const profileName = document.getElementById('profileName');
const profileLink = document.getElementById('profileLink');
const totalGames = document.getElementById('totalGames');
const totalHours = document.getElementById('totalHours');

let currentGames = [];
let currentSort = 'desc';

// ---- Particle Canvas ----
function initParticles() {
  const canvas = document.getElementById('particles');
  const ctx = canvas.getContext('2d');
  let particles = [];
  let animFrame;
  let mouseX = -1000;
  let mouseY = -1000;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  resize();
  window.addEventListener('resize', () => {
    resize();
    initParticlesArray();
  });

  function initParticlesArray() {
    const count = Math.min(80, Math.floor((canvas.width * canvas.height) / 15000));
    particles = [];
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2 + 0.5,
        speedX: (Math.random() - 0.5) * 0.3,
        speedY: (Math.random() - 0.5) * 0.3,
        opacity: Math.random() * 0.5 + 0.1,
      });
    }
  }

  initParticlesArray();

  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach((p) => {
      // Move
      p.x += p.speedX;
      p.y += p.speedY;

      // Wrap around
      if (p.x < -10) p.x = canvas.width + 10;
      if (p.x > canvas.width + 10) p.x = -10;
      if (p.y < -10) p.y = canvas.height + 10;
      if (p.y > canvas.height + 10) p.y = -10;

      // Mouse interaction
      const dx = mouseX - p.x;
      const dy = mouseY - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 150) {
        const force = (150 - dist) / 150;
        p.x -= dx * force * 0.02;
        p.y -= dy * force * 0.02;
      }

      // Draw
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(150, 180, 220, ${p.opacity})`;
      ctx.fill();
    });

    // Draw connections
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(150, 180, 220, ${0.06 * (1 - dist / 120)})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }

    animFrame = requestAnimationFrame(animate);
  }

  animate();
}

// ---- Format helpers ----
function formatHours(hours) {
  if (hours >= 10000) return `${(hours / 1000).toFixed(1)}k`;
  if (hours >= 1) return hours.toFixed(1);
  return hours.toFixed(1);
}

function formatMinutes(minutes) {
  if (minutes < 60) return `${minutes} 分钟`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h < 100) return `${h}h ${m}m`;
  return `${h}h`;
}

// ---- API Call ----
async function fetchGames(identifier) {
  try {
    const res = await fetch(`/api/games/${encodeURIComponent(identifier)}`);
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || '请求失败');
    }

    return data;
  } catch (err) {
    if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
      throw new Error('无法连接到服务器，请确保后端已启动');
    }
    throw err;
  }
}

// ---- Render ----
function renderResults(data) {
  currentGames = data.games;
  currentSort = 'desc';

  // Profile
  profileAvatar.src = data.player.avatar || '';
  profileAvatar.onerror = () => {
    profileAvatar.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect fill="%231a1a2e" width="64" height="64"/><text x="32" y="38" text-anchor="middle" fill="%23555" font-size="24">?</text></svg>';
  };
  profileName.textContent = data.player.nickname;
  profileLink.href = data.player.profileurl;
  totalGames.textContent = data.total_games;
  totalHours.textContent = formatHours(data.total_playtime_hours);

  // Sort and render
  sortAndRender('desc');

  // Scroll to results
  resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function sortAndRender(sortType) {
  currentSort = sortType;

  const sorted = [...currentGames];

  if (sortType === 'desc') {
    sorted.sort((a, b) => b.playtime_minutes - a.playtime_minutes);
  } else if (sortType === 'asc') {
    sorted.sort((a, b) => a.playtime_minutes - b.playtime_minutes);
  } else if (sortType === 'alpha') {
    sorted.sort((a, b) => a.name.localeCompare(b.name, 'zh'));
  }

  // Find max playtime for bar scaling
  const maxPlaytime = sorted.length > 0 ? sorted[0].playtime_minutes : 1;

  gamesList.innerHTML = sorted
    .map((game, i) => {
      const rank = sortType === 'desc' ? i + 1 : sorted.length - i;
      const barWidth = (game.playtime_minutes / maxPlaytime) * 100;
      let topClass = '';
      if (rank === 1) topClass = 'top-1';
      else if (rank === 2) topClass = 'top-2';
      else if (rank === 3) topClass = 'top-3';

      return `
        <div class="game-card ${topClass}" style="--bar-width: ${barWidth}%">
          <div class="game-rank">#${rank}</div>
          <img
            class="game-icon"
            src="${game.img_icon_url || ''}"
            alt=""
            loading="lazy"
            onerror="this.style.display='none'"
          />
          <div class="game-info">
            <div class="game-name" title="${escapeHtml(game.name)}">${escapeHtml(game.name)}</div>
            <div class="game-playtime">${formatMinutes(game.playtime_minutes)}</div>
          </div>
          <div class="game-hours">
            <span class="hours-value">${formatHours(game.playtime_hours)}</span>
            <span class="hours-unit">小时</span>
          </div>
        </div>
      `;
    })
    .join('');

  // Animate bars
  requestAnimationFrame(() => {
    document.querySelectorAll('.game-card').forEach((card) => {
      card.style.setProperty('--bar-width', card.style.getPropertyValue('--bar-width'));
    });
  });

  // Update sort button states
  document.querySelectorAll('.sort-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.sort === sortType);
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ---- View Management ----
function showLoading() {
  heroSection.style.display = 'none';
  loadingSection.classList.add('active');
  errorSection.classList.remove('active');
  resultsSection.classList.remove('active');
}

function showError(message, hint) {
  heroSection.style.display = 'none';
  loadingSection.classList.remove('active');
  errorSection.classList.add('active');
  resultsSection.classList.remove('active');
  errorMsg.textContent = message;
  errorHint.textContent = hint || '';
}

function showResults(data) {
  heroSection.style.display = 'none';
  loadingSection.classList.remove('active');
  errorSection.classList.remove('active');
  resultsSection.classList.add('active');
  renderResults(data);
}

function resetView() {
  heroSection.style.display = '';
  loadingSection.classList.remove('active');
  errorSection.classList.remove('active');
  resultsSection.classList.remove('active');
  steamInput.value = '';
  steamInput.focus();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ---- Search Handler ----
async function handleSearch() {
  const query = steamInput.value.trim();
  if (!query) {
    steamInput.focus();
    return;
  }

  showLoading();

  try {
    const data = await fetchGames(query);
    showResults(data);
  } catch (err) {
    let hint = '';
    if (err.message.includes('私密')) {
      hint = '请在 Steam 客户端中：个人资料 → 编辑个人资料 → 隐私设置 → 游戏详情设为"公开"';
    } else if (err.message.includes('无法找到')) {
      hint = '尝试使用 Steam 个人资料页面的完整 URL 或 17 位 Steam ID';
    }
    showError(err.message, hint);
  }
}

// ---- Event Listeners ----
searchBtn.addEventListener('click', handleSearch);
steamInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') handleSearch();
});

// Sort buttons
document.querySelector('.stats-actions').addEventListener('click', (e) => {
  const btn = e.target.closest('.sort-btn');
  if (!btn) return;
  sortAndRender(btn.dataset.sort);
});

// ---- Init ----
initParticles();

// Focus input on load
setTimeout(() => steamInput.focus(), 500);
