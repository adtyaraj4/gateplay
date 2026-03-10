/* ─── GatePlay Frontend ──────────────────────────────────────────────────── */

const API = '';   // same-origin; change to 'http://localhost:5000' for separate dev server
let clerk = null;
let currentToken = null;
let allMovies = [];
let selectedPlan = null;

const PLAN_PRICES = { monthly: 9.99, yearly: 79.99 };

// ─── Init ─────────────────────────────────────────────────────────────────────
window.addEventListener('load', async () => {
  document.getElementById('footer-year').textContent = new Date().getFullYear();
  await initClerk();
  await loadMovies();
  setupFilterTabs();
  setupCardFormatting();
});

async function initClerk() {
  try {
    await window.Clerk?.load();
    clerk = window.Clerk;
    if (clerk?.user) {
      currentToken = await clerk.session.getToken();
      renderAuthenticatedUI();
    } else {
      renderGuestUI();
    }
    clerk?.addListener(({ user }) => {
      if (user) {
        clerk.session.getToken().then((t) => {
          currentToken = t;
          renderAuthenticatedUI();
          loadMovies();
        });
      } else {
        currentToken = null;
        renderGuestUI();
        loadMovies();
      }
    });
  } catch (e) {
    console.warn('Clerk not loaded — running in demo mode');
  }
}

// ─── Auth UI ──────────────────────────────────────────────────────────────────
function renderGuestUI() {
  document.getElementById('sign-in-btn').classList.remove('hidden');
  document.getElementById('sign-up-btn').classList.remove('hidden');
  document.getElementById('user-banner').classList.add('hidden');
  document.getElementById('sign-in-btn').onclick = () => clerk?.openSignIn();
  document.getElementById('sign-up-btn').onclick = () => clerk?.openSignUp();
  document.getElementById('hero-cta').onclick     = () => clerk?.openSignUp();
  document.getElementById('free-cta').onclick     = () => clerk?.openSignUp();
}

function renderAuthenticatedUI() {
  document.getElementById('sign-in-btn').classList.add('hidden');
  document.getElementById('sign-up-btn').classList.add('hidden');
  const banner = document.getElementById('user-banner');
  banner.classList.remove('hidden');

  const email = clerk?.user?.primaryEmailAddress?.emailAddress ?? '';
  const firstName = clerk?.user?.firstName ?? email.split('@')[0] ?? 'there';
  document.getElementById('user-greeting').textContent = `👋 Hi, ${firstName}!`;
  document.getElementById('sign-out-btn').onclick = () => clerk?.signOut();
  document.getElementById('hero-cta').onclick = () => document.getElementById('movies').scrollIntoView({ behavior: 'smooth' });
  document.getElementById('free-cta').onclick = () => document.getElementById('movies').scrollIntoView({ behavior: 'smooth' });

  // Fetch DB role
  apiFetch('/api/auth/me').then((data) => {
    if (data?.role) setRoleBadge(data.role);
  }).catch(() => {});
}

function setRoleBadge(role) {
  const badge = document.getElementById('role-badge');
  badge.textContent = role === 'premium' ? '⭐ Premium' : 'Free';
  badge.classList.toggle('premium', role === 'premium');
}

// ─── API Helper ───────────────────────────────────────────────────────────────
async function apiFetch(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers ?? {}) };
  if (currentToken) headers['Authorization'] = `Bearer ${currentToken}`;
  const res = await fetch(API + path, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw { status: res.status, ...data };
  return data;
}

// ─── Movies ───────────────────────────────────────────────────────────────────
async function loadMovies() {
  try {
    allMovies = await apiFetch('/api/movies/all');
    renderMovies(allMovies);
    renderHeroPosters(allMovies);
  } catch (e) {
    document.getElementById('movies-grid').innerHTML = `<p style="color:var(--text-muted)">Could not load movies. Is the server running?</p>`;
  }
}

function renderMovies(movies) {
  const grid = document.getElementById('movies-grid');
  if (!movies.length) {
    grid.innerHTML = '<p style="color:var(--text-muted);padding:1rem">No movies found.</p>';
    return;
  }
  grid.innerHTML = movies.map(movieCard).join('');
}

function movieCard(m) {
  const locked = m.locked;
  return `
    <div class="movie-card" onclick="handlePlay('${m.slug}','${escHtml(m.title)}',${locked})">
      <div class="poster-wrap">
        <img class="poster" src="${m.poster_url}" alt="${escHtml(m.title)}" loading="lazy" />
        ${locked
          ? `<div class="lock-overlay">🔒</div>`
          : `<div class="play-overlay"><span class="play-icon">▶</span></div>`
        }
      </div>
      <div class="card-body">
        <div class="card-title">${escHtml(m.title)}</div>
        <div class="card-meta">
          <span class="rating">★ ${m.rating ?? '—'}</span>
          <span class="tier-tag ${m.tier}">${m.tier}</span>
        </div>
      </div>
    </div>`;
}

function renderHeroPosters(movies) {
  const el = document.getElementById('hero-posters');
  const sample = movies.slice(0, 6);
  el.innerHTML = sample.map((m) =>
    `<img class="poster-thumb" src="${m.poster_url}" alt="${escHtml(m.title)}" loading="lazy" />`
  ).join('');
}

// ─── Play Handler ─────────────────────────────────────────────────────────────
async function handlePlay(slug, title, locked) {
  if (!currentToken) {
    clerk?.openSignIn();
    return;
  }
  if (locked) {
    openModal('upgrade-modal');
    return;
  }
  try {
    const data = await apiFetch(`/api/movies/${slug}/play`, { method: 'POST' });
    openPlayerModal(data.movie.title, data.movie.stream_url);
  } catch (err) {
    if (err.upgrade) {
      openModal('upgrade-modal');
    } else {
      showToast(err.error || 'Playback failed', 'error');
    }
  }
}

function openPlayerModal(title, streamUrl) {
  document.getElementById('player-title').textContent = title;
  document.getElementById('video-source').src = streamUrl;
  const video = document.getElementById('video-player');
  video.load();
  video.play().catch(() => {});
  openModal('player-modal');
}

// ─── Filter Tabs ──────────────────────────────────────────────────────────────
function setupFilterTabs() {
  document.querySelectorAll('.filter-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const f = btn.dataset.filter;
      const filtered = f === 'all' ? allMovies : allMovies.filter((m) => m.tier === f);
      renderMovies(filtered);
    });
  });
}

// ─── Payment ──────────────────────────────────────────────────────────────────
function openPaymentModal(plan) {
  if (!currentToken) {
    clerk?.openSignIn();
    return;
  }
  selectedPlan = plan;
  const price = PLAN_PRICES[plan];
  document.getElementById('payment-summary').innerHTML =
    `Plan: <strong>${plan.charAt(0).toUpperCase() + plan.slice(1)}</strong> &nbsp;|&nbsp; Total: <strong>$${price}</strong>`;
  document.getElementById('pay-btn').onclick = handlePayment;
  openModal('payment-modal');
}

async function handlePayment() {
  const btn = document.getElementById('pay-btn');
  btn.disabled = true;
  btn.textContent = 'Processing…';
  try {
    await apiFetch('/api/payment/upgrade', {
      method: 'POST',
      body: JSON.stringify({ plan: selectedPlan, amount: PLAN_PRICES[selectedPlan] }),
    });
    closeModal('payment-modal');
    showToast('🎉 Welcome to GatePlay Premium!', 'success');
    setRoleBadge('premium');
    // Refresh movies to unlock premium content
    currentToken = await clerk?.session?.getToken();
    await loadMovies();
  } catch (err) {
    showToast(err.error || 'Payment failed', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Confirm & Pay';
  }
}

// ─── Card Formatting ──────────────────────────────────────────────────────────
function setupCardFormatting() {
  const num = document.getElementById('card-number');
  if (!num) return;
  num.addEventListener('input', () => {
    num.value = num.value.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim().slice(0, 19);
  });
  const exp = document.getElementById('card-expiry');
  exp.addEventListener('input', () => {
    exp.value = exp.value.replace(/\D/g, '').replace(/^(\d{2})(\d)/, '$1/$2').slice(0, 5);
  });
}

// ─── Modal Helpers ────────────────────────────────────────────────────────────
function openModal(id) {
  document.getElementById(id).classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}
function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
  document.body.style.overflow = '';
  if (id === 'player-modal') {
    const video = document.getElementById('video-player');
    video.pause();
    video.src = '';
  }
}
// Close on overlay click
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.add('hidden');
    document.body.style.overflow = '';
  }
});
// ESC to close
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay:not(.hidden)').forEach((m) => {
      m.classList.add('hidden');
      document.body.style.overflow = '';
    });
  }
});

// ─── Toast ────────────────────────────────────────────────────────────────────
let toastTimer = null;
function showToast(msg, type = 'success') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `toast ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), 4000);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function escHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}
