// ============================================
// Steam Library Viewer — Interactive Scripts
// ============================================

// ---- i18n ----
const i18n = {
  zh: {
    pageTitle: 'Steam Library Viewer — 游戏时长展示',
    heroLine1: '探索你的',
    heroLine2: '游戏世界',
    heroDesc: '输入 Steam ID，即刻查看库中所有游戏的游玩时长',
    searchPlaceholder: '输入 Steam ID 或自定义 URL',
    searchHint: '支持 17 位 Steam ID 或自定义 URL 名称',
    searchBtn: '查询',
    loading: '正在读取游戏库...',
    errorTitle: '出错了',
    retryBtn: '重新查询',
    viewProfile: '查看 Steam 个人资料',
    statGames: '款游戏',
    statHours: '小时',
    statsLabel: '按游玩时长从高到低排列',
    sortDesc: '时长 ↓',
    sortAsc: '时长 ↑',
    backTop: '重新查询',
    footer: 'Powered by Steam Web API · 数据延迟最长 5 分钟 · 仅展示公开资料',
  },
  en: {
    pageTitle: 'Steam Library Viewer — Playtime Showcase',
    heroLine1: 'Explore Your',
    heroLine2: 'Gaming World',
    heroDesc: 'Enter a Steam ID to view playtime for all games in your library',
    searchPlaceholder: 'Enter Steam ID or custom URL',
    searchHint: 'Supports 17-digit Steam ID or custom URL name',
    searchBtn: 'Search',
    loading: 'Loading game library...',
    errorTitle: 'Something went wrong',
    retryBtn: 'Try Again',
    viewProfile: 'View Steam Profile',
    statGames: 'games',
    statHours: 'hours',
    statsLabel: 'Sorted by playtime (high to low)',
    sortDesc: 'Hours ↓',
    sortAsc: 'Hours ↑',
    backTop: 'New Search',
    footer: 'Powered by Steam Web API · Data may be delayed up to 5 min · Public profiles only',
  },
  ja: {
    pageTitle: 'Steam Library Viewer — プレイ時間ショーケース',
    heroLine1: 'あなたの',
    heroLine2: 'ゲームの世界を探索',
    heroDesc: 'Steam IDを入力すると、ライブラリ内の全ゲームのプレイ時間を表示します',
    searchPlaceholder: 'Steam IDまたはカスタムURLを入力',
    searchHint: '17桁のSteam IDまたはカスタムURL名に対応',
    searchBtn: '検索',
    loading: 'ゲームライブラリを読み込み中...',
    errorTitle: 'エラーが発生しました',
    retryBtn: '再試行',
    viewProfile: 'Steamプロフィールを表示',
    statGames: 'ゲーム',
    statHours: '時間',
    statsLabel: 'プレイ時間順（高い順）',
    sortDesc: '時間 ↓',
    sortAsc: '時間 ↑',
    backTop: '新しい検索',
    footer: 'Powered by Steam Web API · データは最大5分遅延 · 公開プロフィールのみ',
  },
  ko: {
    pageTitle: 'Steam Library Viewer — 플레이타임 쇼케이스',
    heroLine1: '당신의',
    heroLine2: '게임 세계를 탐험하세요',
    heroDesc: 'Steam ID를 입력하면 라이브러리의 모든 게임 플레이 시간을 확인할 수 있습니다',
    searchPlaceholder: 'Steam ID 또는 사용자 정의 URL 입력',
    searchHint: '17자리 Steam ID 또는 사용자 정의 URL 이름 지원',
    searchBtn: '검색',
    loading: '게임 라이브러리 로딩 중...',
    errorTitle: '오류 발생',
    retryBtn: '다시 시도',
    viewProfile: 'Steam 프로필 보기',
    statGames: '게임',
    statHours: '시간',
    statsLabel: '플레이 시간 순 (높은 순)',
    sortDesc: '시간 ↓',
    sortAsc: '시간 ↑',
    backTop: '새 검색',
    footer: 'Powered by Steam Web API · 최대 5분 지연 가능 · 공개 프로필만 표시',
  },
  fr: {
    pageTitle: 'Steam Library Viewer — Affichage du temps de jeu',
    heroLine1: 'Explorez votre',
    heroLine2: 'Monde de jeu',
    heroDesc: 'Entrez un Steam ID pour voir le temps de jeu de tous les jeux de votre bibliothèque',
    searchPlaceholder: 'Entrez un Steam ID ou une URL personnalisée',
    searchHint: 'Prend en charge l\'ID Steam à 17 chiffres ou le nom d\'URL personnalisé',
    searchBtn: 'Rechercher',
    loading: 'Chargement de la bibliothèque...',
    errorTitle: 'Une erreur est survenue',
    retryBtn: 'Réessayer',
    viewProfile: 'Voir le profil Steam',
    statGames: 'jeux',
    statHours: 'heures',
    statsLabel: 'Trié par temps de jeu (décroissant)',
    sortDesc: 'Heures ↓',
    sortAsc: 'Heures ↑',
    backTop: 'Nouvelle recherche',
    footer: 'Powered by Steam Web API · Délai jusqu\'à 5 minutes · Profils publics uniquement',
  },
  ru: {
    pageTitle: 'Steam Library Viewer — Демонстрация времени в игре',
    heroLine1: 'Исследуйте',
    heroLine2: 'Свой игровой мир',
    heroDesc: 'Введите Steam ID, чтобы увидеть время во всех играх вашей библиотеки',
    searchPlaceholder: 'Введите Steam ID или пользовательский URL',
    searchHint: 'Поддерживает 17-значный Steam ID или имя пользовательского URL',
    searchBtn: 'Поиск',
    loading: 'Загрузка библиотеки игр...',
    errorTitle: 'Произошла ошибка',
    retryBtn: 'Попробовать снова',
    viewProfile: 'Посмотреть профиль Steam',
    statGames: 'игр',
    statHours: 'часов',
    statsLabel: 'Сортировка по времени игры (по убыванию)',
    sortDesc: 'Часы ↓',
    sortAsc: 'Часы ↑',
    backTop: 'Новый поиск',
    footer: 'Powered by Steam Web API · Задержка до 5 минут · Только открытые профили',
  },
};

let currentLang = localStorage.getItem('lang') || 'zh';

function applyTranslations(lang) {
  currentLang = lang;
  localStorage.setItem('lang', lang);

  const t = i18n[lang];

  // Elements with data-i18n
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.dataset.i18n;
    if (t[key]) el.textContent = t[key];
  });

  // Placeholders
  const placeholderEl = document.querySelector('[data-i18n-placeholder]');
  if (placeholderEl && t[placeholderEl.dataset.i18nPlaceholder]) {
    placeholderEl.placeholder = t[placeholderEl.dataset.i18nPlaceholder];
  }

  // Page title & html lang
  if (t.pageTitle) document.title = t.pageTitle;
  const langMap = { zh: 'zh-CN', en: 'en', ja: 'ja', ko: 'ko', fr: 'fr', ru: 'ru' };
  document.documentElement.lang = langMap[lang] || 'zh-CN';

  // Update lang select
  const langSelect = document.getElementById('langSelect');
  if (langSelect) langSelect.value = lang;

  // Re-render games if results are visible (updates playtime formatting)
  if (resultsSection.classList.contains('active') && currentGames.length > 0) {
    sortAndRender(currentSort);
  }
}

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
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const compact = h >= 100;
  switch (currentLang) {
    case 'en':
      if (minutes < 60) return `${minutes} min`;
      return compact ? `${h}h` : `${h}h ${m}m`;
    case 'ja':
      if (minutes < 60) return `${minutes}分`;
      return compact ? `${h}時間` : `${h}時間${m}分`;
    case 'ko':
      if (minutes < 60) return `${minutes}분`;
      return compact ? `${h}시간` : `${h}시간 ${m}분`;
    case 'fr':
      if (minutes < 60) return `${minutes} min`;
      return compact ? `${h}h` : `${h}h ${m}min`;
    case 'ru':
      if (minutes < 60) return `${minutes} мин`;
      return compact ? `${h}ч` : `${h}ч ${m}м`;
    default:
      if (minutes < 60) return `${minutes} 分钟`;
      return compact ? `${h}h` : `${h}h ${m}m`;
  }
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
            <span class="hours-unit">${{ en: 'hrs', ja: '時間', ko: '시간', fr: 'h', ru: 'ч', zh: '小时' }[currentLang] || '小时'}</span>
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
    const msg = err.message;
    const hintKey = msg.includes('私密') || msg.includes('private') || msg.includes('not visible')
      ? 'privacy' : msg.includes('无法找到') || msg.includes('not found')
      ? 'notFound' : msg.includes('服务器') || msg.includes('server') || msg.includes('后端')
      ? 'server' : 'generic';
    const errorHints = {
      zh: { privacy: '请在 Steam 客户端中：个人资料 → 编辑个人资料 → 隐私设置 → 游戏详情设为"公开"', notFound: '尝试使用 Steam 个人资料页面的完整 URL 或 17 位 Steam ID', server: '', generic: '' },
      en: { privacy: 'Go to Steam client: Profile → Edit Profile → Privacy Settings → Set "Game details" to Public', notFound: 'Try using the full Steam profile URL or a 17-digit Steam ID', server: 'Please check that the backend server is running', generic: 'Please try again later' },
      ja: { privacy: 'Steamクライアント: プロフィール → プロフィール編集 → プライバシー設定 → 「ゲーム詳細」を公開に設定', notFound: 'Steamプロフィールの完全なURLまたは17桁のSteam IDをお試しください', server: 'バックエンドサーバーが起動しているか確認してください', generic: 'しばらくしてからもう一度お試しください' },
      ko: { privacy: 'Steam 클라이언트: 프로필 → 프로필 편집 → 개인정보 설정 → "게임 세부정보"를 공개로 설정', notFound: '전체 Steam 프로필 URL 또는 17자리 Steam ID를 사용해 보세요', server: '백엔드 서버가 실행 중인지 확인하세요', generic: '잠시 후 다시 시도해 주세요' },
      fr: { privacy: 'Client Steam : Profil → Modifier le profil → Paramètres de confidentialité → Définir "Détails du jeu" sur Public', notFound: 'Essayez d\'utiliser l\'URL complète du profil Steam ou un Steam ID à 17 chiffres', server: 'Vérifiez que le serveur backend est en cours d\'exécution', generic: 'Veuillez réessayer plus tard' },
      ru: { privacy: 'Откройте клиент Steam: Профиль → Редактировать профиль → Настройки приватности → "Детали игры" сделать общедоступными', notFound: 'Попробуйте использовать полный URL профиля Steam или 17-значный Steam ID', server: 'Проверьте, запущен ли сервер', generic: 'Пожалуйста, попробуйте позже' },
    };
    hint = (errorHints[currentLang] || errorHints.zh)[hintKey] || '';
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

// Language toggle
document.getElementById('langSelect').addEventListener('change', function () {
  applyTranslations(this.value);
});

// ---- Init ----
initParticles();
applyTranslations(currentLang);

// Focus input on load
setTimeout(() => steamInput.focus(), 500);
