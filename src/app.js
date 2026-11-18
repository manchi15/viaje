import {
  callRpc, currentUser, deleteRows, insertRow, isSupabaseConfigured, removePrivateObjects,
  restoreSession, selectRows, signedObjectUrls, updateRows, uploadPrivateObject,
} from './supabase.js';

const TRIP_START = new Date('2026-11-20T00:00:00-05:00').getTime();

const screens = [...document.querySelectorAll('.screen')];
const navButtons = [...document.querySelectorAll('[data-screen]')];
const preview = document.querySelector('#photoPreview');
const photoInput = document.querySelector('#photoInput');
const frameSelect = document.querySelector('#frameSelect');
const vfx = window.NexoraVfx;
const photoUploadForm = document.querySelector('#photoUploadForm');
const captionInput = document.querySelector('#captionInput');
const publishPhotoButton = document.querySelector('#publishPhotoButton');
const uploadStatus = document.querySelector('#uploadStatus');
const storeStatus = document.querySelector('#storeStatus');
const storeCoinBalance = document.querySelector('#storeCoinBalance');
const storeRewardCountdown = document.querySelector('#storeCoinRewardCountdown');
const photoLeaderboard = document.querySelector('#photoLeaderboard');
const photoLeaderboardStatus = document.querySelector('#photoLeaderboardStatus');
const ownPhotoGrid = document.querySelector('#ownPhotoGrid');
const ownPhotoCount = document.querySelector('#ownPhotoCount');
const ownPhotosStatus = document.querySelector('#ownPhotosStatus');
const ownedCollectibleCatalog = document.querySelector('#ownedCollectibleCatalog');
const ownedCollectibleCount = document.querySelector('#ownedCollectibleCount');
const ownedCollectiblesStatus = document.querySelector('#ownedCollectiblesStatus');
const profileDisplayName = document.querySelector('#profileDisplayName');
const profileAdminBadge = document.querySelector('#profileAdminBadge');
const profileNameInput = document.querySelector('#profileName');
const profileNameSaveButton = document.querySelector('#profileNameSaveButton');
const profileNameStatus = document.querySelector('#profileNameStatus');
const profileAvatarImage = document.querySelector('#profileAvatarImage');
const profileAvatarFallback = document.querySelector('#profileAvatarFallback');
const profilePhotoInput = document.querySelector('#profilePhotoInput');
const profilePhotoButton = document.querySelector('#profilePhotoButton');
const profilePhotoStatus = document.querySelector('#profilePhotoStatus');
const profileCropPanel = document.querySelector('#profileCropPanel');
const profileCropPreview = document.querySelector('#profileCropPreview');
const profileCropZoom = document.querySelector('#profileCropZoom');
const profileCropZoomValue = document.querySelector('#profileCropZoomValue');
const profileCropCancel = document.querySelector('#profileCropCancel');
const profileCropSave = document.querySelector('#profileCropSave');
const profileAccountReference = document.querySelector('#profileAccountReference');
const profileAccountId = document.querySelector('#profileAccountId');
const copyProfileAccountId = document.querySelector('#copyProfileAccountId');
const onlineStatus = document.querySelector('#onlineStatus');
const onlineCount = document.querySelector('#onlineCount');
const rouletteTitleInput = document.querySelector('#rouletteTitleInput');
const rouletteTitleHeading = document.querySelector('#rouletteTitle');
const rouletteParticipants = document.querySelector('#rouletteParticipants');
const rouletteWheel = document.querySelector('#rouletteWheel');
const rouletteWheelHome = document.querySelector('#rouletteWheelHome');
const rouletteNames = document.querySelector('#rouletteNames');
const rouletteResult = document.querySelector('#rouletteResult');
const rouletteSpotlight = document.querySelector('#rouletteSpotlight');
const rouletteSpotlightTitle = document.querySelector('#rouletteSpotlightTitle');
const rouletteSpotlightWheelHost = document.querySelector('#rouletteSpotlightWheelHost');
const rouletteSpotlightResult = document.querySelector('#rouletteSpotlightResult');
const rouletteSyncStatus = document.querySelector('#rouletteSyncStatus');
const spinRouletteButton = document.querySelector('#spinRouletteButton');
const ROULETTE_POLL_INTERVAL_MS = 1500;
const ROULETTE_SPIN_DURATION_MS = 4300;
const ROULETTE_COOLDOWN_MS = 8000;
const ROULETTE_RESULT_DISPLAY_MS = 2200;
const rewardCountdown = document.querySelector('#coinRewardCountdown');
const baseUrl = import.meta.env?.BASE_URL || './';
const logoPath = location.protocol === 'file:'
  ? './public/images/logo-nexora/logo.jpg'
  : `${baseUrl}images/logo-nexora/logo.jpg`;
const THEME_KEY = 'nexora-theme';
let previewUrl = '';
let marketItems = [];
let collectibleItems = [];
let ownPhotos = [];
let ownedFrameIds = new Set();
let ownedCollectibleIds = new Set();
let coinBalance = 0;
let nextRewardAt = 0;
let rewardRequestPending = false;
let purchasePending = false;
let deletingPhotoId = '';
let profileAvatarPath = '';
let profilePhotoPending = false;
let profileCropFile = null;
let profileCropUrl = '';
let onlinePresenceTimer = null;
let onlinePresencePending = false;
let profileNamePending = false;
let rouletteRotation = 0;
let rouletteSpinning = false;
let rouletteRequestPending = false;
let roulettePollPending = false;
let rouletteSyncStarted = false;
let rouletteSyncReady = false;
let rouletteLastSpinId = null;
let rouletteCooldownUntil = 0;
let rouletteAnimationTimer = 0;
let rouletteCooldownTimer = 0;
let rouletteSpotlightTimer = 0;
let roulettePollTimer = 0;

function applyTheme(themeName) {
  const theme = themeName === 'dark' ? 'dark' : 'light';
  document.body.dataset.theme = theme;
  try { localStorage.setItem(THEME_KEY, theme); } catch (error) {}
  const toggle = document.querySelector('#themeToggle');
  if (!toggle) return;
  const icon = toggle.querySelector('span');
  toggle.setAttribute('aria-label', theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
  toggle.setAttribute('aria-pressed', String(theme === 'dark'));
  if (icon) icon.textContent = theme === 'dark' ? '☀' : '☾';
}

let savedTheme = 'dark';
try { savedTheme = localStorage.getItem(THEME_KEY) || 'dark'; } catch (error) {}
applyTheme(savedTheme);
document.querySelector('#themeToggle')?.addEventListener('click', () => {
  const nextTheme = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
  applyTheme(nextTheme);
});

document.querySelectorAll('.brand img, .feed-avatar, .rail-avatar').forEach((image) => {
  image.src = logoPath;
});
const creatorPhoto = document.querySelector('#creatorPhoto');
if (creatorPhoto) creatorPhoto.src = `${baseUrl}images/nosotros/foto/foto.jpg`;
document.querySelector('link[rel="icon"]').href = logoPath;
if (location.protocol === 'file:') {
  document.querySelector('#localFileNotice').hidden = false;
}

renderFrameCatalog();
renderCollectibles();
renderOwnedCollectibles();
renderRouletteTitle();
renderRouletteWheel();
bindNavigation();
bindPhotoPreview();
bindPhotoManagement();
bindProfileName();
bindProfilePhoto();
bindMarket();
bindRoulette();
connectAccount();
updateCountdown();
window.setInterval(updateCountdown, 1000);
openScreen(location.hash.slice(1) || 'inicio', false);

function bindNavigation() {
  navButtons.forEach((button) => {
    button.addEventListener('click', () => openScreen(button.dataset.screen));
  });
  document.querySelector('.brand')?.addEventListener('click', (event) => {
    event.preventDefault();
    openScreen('inicio');
  });
  document.querySelectorAll('[data-open-screen]').forEach((button) => {
    button.addEventListener('click', () => {
      if (button.dataset.storeCategory) setStoreTab(button.dataset.storeCategory);
      openScreen(button.dataset.openScreen);
    });
  });
  window.addEventListener('popstate', () => openScreen(location.hash.slice(1) || 'inicio', false));
}

function openScreen(id, addHistory = true) {
  const active = screens.find((screen) => screen.id === id);
  if (!active) return;
  screens.forEach((screen) => {
    screen.hidden = screen !== active;
    screen.classList.remove('screen-entering');
  });
  void active.offsetWidth;
  active.classList.add('screen-entering');
  staggerEntries(active);
  navButtons.forEach((button) => {
    if (button.dataset.screen === id) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  if (addHistory && location.hash !== `#${id}`) history.pushState({ screen: id }, '', `#${id}`);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function staggerEntries(root) {
  root.querySelectorAll('.frame-card, .collectible-card, .leaderboard-entry, .own-photo-card')
    .forEach((item, index) => item.style.setProperty('--motion-index', Math.min(index, 8)));
}

function updateCountdown() {
  const target = document.querySelector('#countdown');
  const remaining = TRIP_START - Date.now();
  if (remaining <= 0) {
    document.querySelector('#countdownTitle').textContent = 'El viaje ya comenzó';
    target.innerHTML = '<strong class="trip-started">¡Ya estamos en Melgar!</strong>';
    return;
  }
  const seconds = Math.floor(remaining / 1000);
  const units = [
    [Math.floor(seconds / 86400), 'días'],
    [Math.floor((seconds % 86400) / 3600), 'horas'],
    [Math.floor((seconds % 3600) / 60), 'min'],
    [seconds % 60, 'seg'],
  ];
  target.innerHTML = units.map(([value, label]) => `<span><strong>${String(value).padStart(2, '0')}</strong><small>${label}</small></span>`).join('');
}

function renderFrameCatalog() {
  const catalog = document.querySelector('#frameCatalog');
  vfx.unobserveFrames(catalog);
  catalog.replaceChildren(...marketItems.map((item, index) => {
    const rarity = ['common', 'rare', 'epic', 'legendary'].includes(item.rarity) ? item.rarity : 'common';
    const frameStyle = vfx.normalizeStyle(item.preview_style);
    const card = document.createElement('article');
    card.className = `surface frame-card frame-card--${rarity} frame-card--style-${frameStyle}`;
    const meta = document.createElement('div');
    meta.className = 'frame-card-meta';
    const collection = document.createElement('span');
    collection.className = 'frame-card-collection';
    collection.textContent = `VFX · ${String(index + 1).padStart(2, '0')}`;
    const rarityBadge = document.createElement('span');
    rarityBadge.className = `frame-rarity frame-rarity--${rarity}`;
    rarityBadge.textContent = ({ common: 'COMÚN', rare: 'RARO', epic: 'ÉPICO', legendary: 'MÍTICO' })[rarity];
    meta.append(collection, rarityBadge);
    const previewFrame = document.createElement('div');
    previewFrame.className = 'frame-vfx-preview';
    previewFrame.append(vfx.createFrame(frameStyle, { placeholder: item.name }));
    const details = document.createElement('div');
    details.className = 'frame-details';
    const title = document.createElement('h2');
    title.textContent = item.name;
    const description = document.createElement('p');
    description.className = 'frame-description';
    description.textContent = item.description || 'Un efecto especial para personalizar tus recuerdos.';
    const priceBlock = document.createElement('div');
    priceBlock.className = 'frame-price-block';
    const priceLabel = document.createElement('small');
    priceLabel.textContent = 'PRECIO';
    const price = document.createElement('p');
    price.className = 'frame-price';
    price.textContent = `${formatNumber(item.price)} NX`;
    priceBlock.append(priceLabel, price);
    const button = document.createElement('button');
    button.className = 'frame-buy-button';
    button.type = 'button';
    button.dataset.buyFrame = item.id;
    const owned = ownedFrameIds.has(item.id);
    const connected = Boolean(currentUser());
    const affordable = coinBalance >= Number(item.price);
    button.disabled = owned || purchasePending || !connected || !affordable;
    if (owned) button.classList.add('is-owned');
    button.textContent = owned
      ? '✓ En tu colección'
      : purchasePending
        ? 'Procesando…'
        : !connected
          ? 'Conecta tu cuenta'
          : affordable
            ? 'Desbloquear marco'
            : `Te faltan ${formatNumber(Number(item.price) - coinBalance)} NX`;
    details.append(title, description, priceBlock, button);
    card.append(meta, previewFrame, details);
    return card;
  }));
  if (!marketItems.length) {
    const message = document.createElement('p');
    message.className = 'market-empty';
    message.textContent = 'Conecta tu cuenta para cargar los marcos de la tienda.';
    catalog.append(message);
  }
  vfx.observeFrames(catalog);
  staggerEntries(catalog);
}

function renderCollectibles() {
  const catalog = document.querySelector('#collectibleCatalog');
  catalog.replaceChildren(...collectibleItems.map((item, index) => {
    const card = document.createElement('article');
    card.className = 'surface collectible-card';
    const art = document.createElement('div');
    art.className = 'collectible-art';
    const placeholder = document.createElement('div');
    placeholder.className = 'collectible-placeholder';
    const marker = document.createElement('span');
    marker.textContent = '✦';
    const figure = document.createElement('strong');
    figure.textContent = `FIGURITA ${String(index + 1).padStart(2, '0')}`;
    const filename = document.createElement('small');
    filename.textContent = 'IMAGEN PENDIENTE';
    placeholder.append(marker, figure, filename);
    const image = document.createElement('img');
    image.className = 'collectible-image';
    image.alt = item.name;
    image.loading = 'eager';
    image.decoding = 'async';
    image.hidden = true;
    image.addEventListener('load', () => {
      image.hidden = false;
      placeholder.hidden = true;
    }, { once: true });
    image.addEventListener('error', () => {
      filename.textContent = `Añade ${item.slug}.jpg`;
    }, { once: true });
    image.src = `${baseUrl}images/collectibles/${encodeURIComponent(item.slug)}.jpg`;
    art.append(placeholder, image);

    const details = document.createElement('div');
    details.className = 'collectible-details';
    const serial = document.createElement('small');
    serial.className = 'collectible-serial';
    serial.textContent = `COLECCIÓN · ${String(index + 1).padStart(2, '0')} / 16`;
    const title = document.createElement('h3');
    title.textContent = item.name;
    const description = document.createElement('p');
    description.textContent = item.description || 'Una figurita para completar tu colección NEXORA.';
    const price = document.createElement('strong');
    price.className = 'collectible-price';
    price.textContent = `${formatNumber(item.price)} NX`;
    const button = document.createElement('button');
    button.className = 'frame-buy-button';
    button.type = 'button';
    button.dataset.buyCollectible = item.id;
    const owned = ownedCollectibleIds.has(item.id);
    const connected = Boolean(currentUser());
    const affordable = coinBalance >= Number(item.price);
    button.disabled = owned || purchasePending || !connected || !affordable;
    if (owned) button.classList.add('is-owned');
    button.textContent = owned
      ? '✓ En tu colección'
      : purchasePending
        ? 'Procesando…'
        : !connected
          ? 'Conecta tu cuenta'
          : affordable
            ? 'Añadir a mi colección'
            : `Te faltan ${formatNumber(Number(item.price) - coinBalance)} NX`;
    details.append(serial, title, description, price, button);
    card.append(art, details);
    return card;
  }));
  if (!collectibleItems.length) {
    const message = document.createElement('p');
    message.className = 'market-empty';
    message.textContent = currentUser()
      ? 'El cofre todavía no está configurado. Aplica la migración de Coleccionables en Supabase.'
      : 'Conecta tu cuenta para abrir el cofre de Coleccionables.';
    catalog.append(message);
  }
  staggerEntries(catalog);
}

function renderOwnedCollectibles() {
  const owned = collectibleItems.filter((item) => ownedCollectibleIds.has(item.id));
  ownedCollectibleCount.textContent = `${owned.length} / ${collectibleItems.length || 16}`;
  ownedCollectibleCatalog.replaceChildren(...owned.map((item) => {
    const card = document.createElement('article');
    card.className = 'surface collectible-card';
    const art = document.createElement('div');
    art.className = 'collectible-art';
    const image = document.createElement('img');
    image.className = 'collectible-image';
    image.alt = item.name;
    image.loading = 'eager';
    image.decoding = 'async';
    image.src = `${baseUrl}images/collectibles/${encodeURIComponent(item.slug)}.jpg`;
    art.append(image);

    const details = document.createElement('div');
    details.className = 'collectible-details';
    const serial = document.createElement('small');
    serial.className = 'collectible-serial';
    const catalogIndex = collectibleItems.findIndex((entry) => entry.id === item.id);
    serial.textContent = `DESBLOQUEADA · ${String(catalogIndex + 1).padStart(2, '0')} / ${collectibleItems.length}`;
    const title = document.createElement('h3');
    title.textContent = item.name;
    details.append(serial, title);
    card.append(art, details);
    return card;
  }));
  staggerEntries(ownedCollectibleCatalog);

  if (!currentUser()) {
    ownedCollectiblesStatus.textContent = isSupabaseConfigured
      ? 'Conectando con tu colección…'
      : 'Configura Supabase para cargar tus coleccionables.';
  } else if (!collectibleItems.length) {
    ownedCollectiblesStatus.textContent = 'El catálogo de coleccionables todavía no está disponible.';
  } else if (!owned.length) {
    ownedCollectiblesStatus.textContent = 'Aún no tienes figuritas. Abre el cofre para conseguir la primera.';
  } else {
    ownedCollectiblesStatus.textContent = `Has desbloqueado ${owned.length} de ${collectibleItems.length} figuritas.`;
  }
}

function getRouletteParticipants() {
  const seen = new Set();
  return rouletteParticipants.value
    .split(/\r?\n/)
    .map((name) => name.trim())
    .filter((name) => {
      const key = name.toLocaleLowerCase('es-CO');
      if (!name || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function renderRouletteWheel() {
  const participants = getRouletteParticipants();
  rouletteNames.replaceChildren();
  if (!participants.length) {
    rouletteWheel.style.background = 'conic-gradient(#73535a, #af8d62, #556b61, #73535a)';
    updateRouletteButton();
    return participants;
  }

  const step = 360 / participants.length;
  const sectors = participants.map((_, index) => {
    const hue = (index * 360 / participants.length + 12) % 360;
    return `hsl(${hue} 42% 38%) ${index * step}deg ${(index + 1) * step}deg`;
  });
  rouletteWheel.style.background = `conic-gradient(${sectors.join(', ')})`;
  const fontSize = Math.max(.42, Math.min(.7, 6 / participants.length));
  participants.forEach((name, index) => {
    const angle = (index + .5) * step * Math.PI / 180;
    const label = document.createElement('span');
    label.textContent = name;
    label.style.left = `${50 + 35 * Math.sin(angle)}%`;
    label.style.top = `${50 - 35 * Math.cos(angle)}%`;
    label.style.fontSize = `${fontSize}rem`;
    rouletteNames.append(label);
  });
  updateRouletteButton();
  return participants;
}

function renderRouletteTitle() {
  const title = rouletteTitleInput.value.trim();
  rouletteTitleHeading.textContent = title || 'Tu ruleta';
}

function rouletteParticipantError(participants) {
  if (participants.length < 2) return 'Escribe al menos dos nombres distintos; los duplicados cuentan una sola vez.';
  if (participants.length > 50) return 'La ruleta admite hasta 50 participantes.';
  if (participants.some((name) => [...name].length > 60)) return 'Cada nombre debe tener 60 caracteres o menos.';
  return '';
}

function updateRouletteButton() {
  spinRouletteButton.disabled = rouletteSpinning
    || rouletteRequestPending
    || !rouletteSyncReady
    || !currentUser()
    || Boolean(rouletteParticipantError(getRouletteParticipants()))
    || Date.now() < rouletteCooldownUntil;
}

function setSharedRouletteParticipants(state) {
  const participants = Array.isArray(state.participants)
    ? state.participants.filter((name) => typeof name === 'string' && name.trim())
    : [];
  rouletteTitleInput.value = typeof state.prompt === 'string' ? state.prompt : '';
  renderRouletteTitle();
  rouletteParticipants.value = participants.join('\n');
  renderRouletteWheel();
  return participants;
}

function showRouletteSyncError(error) {
  rouletteSyncReady = false;
  rouletteSyncStatus.textContent = error.status === 404
    ? 'Falta ejecutar 20261125_nexora_shared_roulette.sql en Supabase para sincronizar la ruleta.'
    : `No se pudo sincronizar la ruleta: ${error.message}`;
  updateRouletteButton();
}

function stopSharedRoulettePolling() {
  window.clearInterval(roulettePollTimer);
  roulettePollTimer = 0;
}

function showSharedRouletteResult(state) {
  rouletteResult.textContent = state.prompt
    ? `Último giro: ${state.winner}. Título: ${state.prompt}.`
    : `Último resultado: ${state.winner}.`;
}

function showRouletteSpotlight() {
  window.clearTimeout(rouletteSpotlightTimer);
  rouletteSpotlight.hidden = false;
  rouletteSpotlightWheelHost.append(rouletteWheel);
  rouletteSpotlightResult.textContent = 'La ruleta está girando…';
  document.body.classList.add('roulette-spotlight-open');
  rouletteSpotlight.classList.remove('is-closing');
  rouletteWheel.offsetWidth;
}

function hideRouletteSpotlight() {
  window.clearTimeout(rouletteSpotlightTimer);
  rouletteSpotlight.classList.add('is-closing');
  rouletteSpotlightTimer = window.setTimeout(() => {
    rouletteWheelHome.append(rouletteWheel);
    rouletteSpotlight.hidden = true;
    rouletteSpotlight.classList.remove('is-closing');
    document.body.classList.remove('roulette-spotlight-open');
    rouletteSpotlightTimer = 0;
  }, 180);
}

function scheduleRouletteCooldown() {
  window.clearTimeout(rouletteCooldownTimer);
  const remaining = Math.max(0, rouletteCooldownUntil - Date.now());
  if (remaining > 0) {
    rouletteCooldownTimer = window.setTimeout(updateRouletteButton, remaining + 25);
  }
  updateRouletteButton();
}

function applySharedRouletteSpin(event, { replay = false } = {}) {
  const state = Array.isArray(event) ? event[0] : event;
  const spinId = Number(state?.spin_id);
  if (!Number.isSafeInteger(spinId) || spinId < 1) {
    throw new Error('Supabase devolvió un giro compartido inválido.');
  }
  if (!replay && rouletteLastSpinId !== null && spinId <= rouletteLastSpinId) {
    rouletteRequestPending = false;
    rouletteTitleInput.disabled = false;
    rouletteParticipants.disabled = false;
    updateRouletteButton();
    return;
  }

  const participants = setSharedRouletteParticipants(state);
  const winnerIndex = participants.findIndex((name) => name === state.winner);
  if (winnerIndex < 0) throw new Error('El resultado no coincide con los nombres de la ruleta.');
  rouletteLastSpinId = spinId;
  rouletteRequestPending = false;

  const startedAt = Date.parse(state.spun_at);
  const elapsed = Number.isFinite(startedAt) ? Math.max(0, Date.now() - startedAt) : 0;
  const animationDuration = Math.max(0, ROULETTE_SPIN_DURATION_MS - elapsed);
  rouletteCooldownUntil = (Number.isFinite(startedAt) ? startedAt : Date.now()) + ROULETTE_COOLDOWN_MS;
  const centerAngle = (winnerIndex + .5) * 360 / participants.length;
  const alignment = (360 - ((centerAngle + rouletteRotation) % 360)) % 360;
  rouletteRotation += 360 * 6 + alignment;
  if (animationDuration > 0) {
    rouletteSpotlightTitle.textContent = rouletteTitleInput.value.trim() || 'Tu ruleta';
    showRouletteSpotlight();
  }
  rouletteWheel.style.transitionDuration = `${animationDuration}ms`;
  rouletteWheel.style.transform = `rotate(${rouletteRotation}deg)`;
  rouletteSpinning = animationDuration > 0;
  rouletteParticipants.disabled = rouletteSpinning;
  rouletteTitleInput.disabled = rouletteSpinning;
  rouletteResult.textContent = rouletteSpinning
    ? 'La misma ruleta está girando en todos los celulares…'
    : '';
  updateRouletteButton();

  window.clearTimeout(rouletteAnimationTimer);
  rouletteAnimationTimer = window.setTimeout(() => {
    const winnerMessage = `¡Salió ${state.winner}!`;
    rouletteResult.textContent = winnerMessage;
    rouletteSpotlightResult.textContent = winnerMessage;
    rouletteSpinning = false;
    rouletteParticipants.disabled = false;
    rouletteTitleInput.disabled = false;
    rouletteWheel.style.transitionDuration = '';
    updateRouletteButton();
    if (animationDuration > 0) {
      rouletteSpotlightTimer = window.setTimeout(hideRouletteSpotlight, ROULETTE_RESULT_DISPLAY_MS);
    }
  }, Math.max(60, animationDuration));
  scheduleRouletteCooldown();
}

async function pollSharedRouletteState() {
  if (roulettePollPending || !currentUser()) return;
  roulettePollPending = true;
  try {
    const rows = await selectRows(
      'nexora_roulette_state',
      'select=spin_id,prompt,participants,winner,spun_at&singleton=eq.true&limit=1',
    );
    const state = rows[0];
    if (!state) throw new Error('No existe el estado compartido de la ruleta.');

    rouletteSyncReady = true;
    rouletteSyncStatus.textContent = 'Conectada: los giros y nombres se sincronizan en todos los celulares.';
    const spinId = Number(state.spin_id) || 0;
    if (rouletteLastSpinId === null) {
      rouletteLastSpinId = spinId;
      if (spinId > 0) {
        const startedAt = Date.parse(state.spun_at);
        const elapsed = Number.isFinite(startedAt) ? Date.now() - startedAt : Infinity;
        if (elapsed < ROULETTE_SPIN_DURATION_MS) {
          rouletteLastSpinId = spinId - 1;
          applySharedRouletteSpin(state, { replay: true });
        } else {
          setSharedRouletteParticipants(state);
          rouletteCooldownUntil = Number.isFinite(startedAt) ? startedAt + ROULETTE_COOLDOWN_MS : 0;
          showSharedRouletteResult(state);
          scheduleRouletteCooldown();
        }
      } else {
        rouletteResult.textContent = 'Escribe los nombres y gira para todos.';
      }
    } else if (spinId > rouletteLastSpinId) {
      applySharedRouletteSpin(state);
    } else {
      updateRouletteButton();
    }
  } catch (error) {
    if (error.status === 404) {
      showRouletteSyncError(error);
      stopSharedRoulettePolling();
    } else {
      rouletteSyncStatus.textContent = `No se pudo sincronizar la ruleta: ${error.message}`;
      rouletteSyncReady = false;
      updateRouletteButton();
    }
  } finally {
    roulettePollPending = false;
  }
}

function startSharedRouletteSync() {
  if (rouletteSyncStarted) return;
  rouletteSyncStarted = true;
  pollSharedRouletteState();
  roulettePollTimer = window.setInterval(pollSharedRouletteState, ROULETTE_POLL_INTERVAL_MS);
}

function bindRoulette() {
  rouletteTitleInput.addEventListener('input', renderRouletteTitle);
  rouletteParticipants.addEventListener('input', () => {
    const participants = renderRouletteWheel();
    if (!rouletteSpinning && !rouletteRequestPending) {
      rouletteResult.textContent = rouletteParticipantError(participants)
        || 'Todo listo. ¡Que gire la ruleta!';
    }
  });
  spinRouletteButton.addEventListener('click', async () => {
    if (rouletteSpinning || rouletteRequestPending) return;
    const participants = renderRouletteWheel();
    const participantError = rouletteParticipantError(participants);
    if (participantError) {
      rouletteResult.textContent = participantError;
      return;
    }
    if (!rouletteSyncReady || !currentUser()) {
      rouletteResult.textContent = 'La ruleta compartida todavía no está conectada.';
      return;
    }

    rouletteRequestPending = true;
    rouletteParticipants.disabled = true;
    rouletteTitleInput.disabled = true;
    updateRouletteButton();
    rouletteResult.textContent = 'Compartiendo el giro con el grupo…';
    try {
      const event = await callRpc('nexora_spin_roulette', {
        p_prompt: rouletteTitleInput.value.trim(),
        p_participants: participants,
      });
      applySharedRouletteSpin(event);
    } catch (error) {
      rouletteRequestPending = false;
      rouletteParticipants.disabled = false;
      rouletteTitleInput.disabled = false;
      rouletteResult.textContent = `No se pudo iniciar el giro: ${error.message}`;
      if (error.status === 404) {
        showRouletteSyncError(error);
        stopSharedRoulettePolling();
      } else {
        updateRouletteButton();
      }
    }
  });
}

function bindPhotoPreview() {
  photoInput.addEventListener('change', () => {
    const file = photoInput.files?.[0];
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = '';
    if (file?.type.startsWith('image/')) previewUrl = URL.createObjectURL(file);
    document.querySelector('#fileLabel').textContent = previewUrl ? file.name : 'Elegir fotografía';
    renderPhotoPreview();
  });
  frameSelect.addEventListener('change', renderPhotoPreview);
  photoUploadForm.addEventListener('submit', publishPhoto);
  renderPhotoPreview();
}

function renderPhotoPreview() {
  const file = photoInput.files?.[0];
  const validImage = file?.type.startsWith('image/') ? file : null;
  const selectedFrame = marketItems.find((item) => item.id === frameSelect.value && ownedFrameIds.has(item.id));
  const frameStyle = selectedFrame ? vfx.normalizeStyle(selectedFrame.preview_style) : '';
  preview.classList.toggle('photo-preview--framed', Boolean(frameStyle));

  if (!validImage && !frameStyle) {
    vfx.unobserveFrames(preview);
    preview.innerHTML = '<span class="empty-symbol" aria-hidden="true">▧</span><p>La vista previa aparecerá aquí.</p>';
    return;
  }

  let image = null;
  if (validImage && previewUrl) {
    image = document.createElement('img');
    image.src = previewUrl;
    image.alt = 'Vista previa de la fotografía seleccionada';
    image.loading = 'eager';
    image.decoding = 'async';
  }
  const content = frameStyle
    ? vfx.createFrame(frameStyle, image
      ? { content: image }
      : { placeholder: selectedFrame.name })
    : image;
  const caption = document.createElement('p');
  caption.textContent = validImage ? validImage.name : 'Elige una foto para ver el efecto sobre tu imagen.';
  vfx.unobserveFrames(preview);
  preview.replaceChildren(content, caption);
  if (frameStyle) vfx.observeFrames(preview);
}

function bindMarket() {
  document.querySelector('#frameCatalog').addEventListener('click', (event) => {
    const button = event.target.closest('[data-buy-frame]');
    if (!button || button.disabled) return;
    const item = marketItems.find((entry) => entry.id === button.dataset.buyFrame);
    if (item) purchaseStoreItem(item, 'frame');
  });
  document.querySelector('#collectibleCatalog').addEventListener('click', (event) => {
    const button = event.target.closest('[data-buy-collectible]');
    if (!button || button.disabled) return;
    const item = collectibleItems.find((entry) => entry.id === button.dataset.buyCollectible);
    if (item) purchaseStoreItem(item, 'collectible');
  });
  document.querySelectorAll('[data-store-tab]').forEach((button) => {
    button.addEventListener('click', () => setStoreTab(button.dataset.storeTab));
  });
}

function setStoreTab(category) {
  const showCollectibles = category === 'collectibles';
  document.querySelector('#frameStorePanel').hidden = showCollectibles;
  document.querySelector('#collectibleStorePanel').hidden = !showCollectibles;
  document.querySelectorAll('.store-tabs [data-store-tab]').forEach((tab) => {
    const selected = tab.dataset.storeTab === category;
    tab.classList.toggle('is-active', selected);
    tab.setAttribute('aria-pressed', String(selected));
  });
}

async function purchaseStoreItem(item, category) {
  const ownedIds = category === 'frame' ? ownedFrameIds : ownedCollectibleIds;
  if (purchasePending || ownedIds.has(item.id) || !currentUser()) return;
  if (coinBalance < Number(item.price)) {
    storeStatus.textContent = `Te faltan ${formatNumber(Number(item.price) - coinBalance)} NX para comprar ${item.name}.`;
    return;
  }
  if (!window.confirm(`¿Comprar ${item.name} por ${formatNumber(item.price)} NexaCoins?`)) return;

  purchasePending = true;
  renderFrameCatalog();
  renderCollectibles();
  try {
    const result = await callRpc('nexora_buy_item', { p_item_id: item.id });
    coinBalance = Number(result.balance);
    ownedIds.add(item.id);
    if (category === 'frame') populateOwnedFrames();
    renderFrameCatalog();
    renderCollectibles();
    renderWallet();
    storeStatus.textContent = `¡${item.name} ya es tuyo! Tu saldo es ${formatNumber(coinBalance)} NX.`;
  } catch (error) {
    storeStatus.textContent = `No se pudo comprar ${category === 'frame' ? 'el marco' : 'la figurita'}: ${error.message}`;
  } finally {
    purchasePending = false;
    renderFrameCatalog();
    renderCollectibles();
    renderOwnedCollectibles();
  }
}

async function connectAccount() {
  if (!isSupabaseConfigured) {
    showConnectionError('Configura Supabase para ganar NexaCoins, comprar marcos y publicar fotos.');
    renderOwnedCollectibles();
    rouletteSyncStatus.textContent = 'Configura Supabase para sincronizar la ruleta entre celulares.';
    profileNameStatus.textContent = 'Configura Supabase para cambiar el nombre de tu perfil.';
    profilePhotoStatus.textContent = 'Configura Supabase para cargar y subir una foto de perfil.';
    return;
  }
  try {
    await restoreSession();
    startOnlinePresence();
    await Promise.all([loadMarket(), loadProfile()]);
    startSharedRouletteSync();
    await Promise.all([loadPhotoLeaderboard(), loadOwnPhotos()]);
    publishPhotoButton.disabled = false;
  } catch (error) {
    showConnectionError(`No se pudo conectar con Supabase: ${error.message}`);
    ownedCollectiblesStatus.textContent = `No se pudo cargar tu colección: ${error.message}`;
    rouletteSyncStatus.textContent = `No se pudo conectar la ruleta: ${error.message}`;
    profileNameStatus.textContent = `No se pudo conectar tu perfil: ${error.message}`;
    profilePhotoStatus.textContent = `No se pudo conectar tu perfil: ${error.message}`;
    return;
  }
  try {
    await claimCoinReward();
    window.setInterval(updateCoinReward, 1000);
  } catch (error) {
    setRewardCountdown(rewardErrorMessage(error));
  }
}

async function loadProfile() {
  const user = currentUser();
  profileNameInput.disabled = true;
  profileNameSaveButton.disabled = true;
  profilePhotoButton.disabled = true;
  profileAccountReference.hidden = !user?.id;
  if (user?.id) profileAccountId.textContent = user.id;
  if (!user?.id) {
    profileNameStatus.textContent = 'No se encontró una sesión para cargar tu perfil.';
    profilePhotoStatus.textContent = 'No se encontró una sesión para cargar tu perfil.';
    return;
  }

  profileNameStatus.textContent = 'Cargando tu perfil…';
  profilePhotoStatus.textContent = 'Cargando tu perfil…';
  try {
    const rows = await selectRows(
      'trip_participants',
      `select=user_id,display_name,avatar_path&user_id=eq.${encodeURIComponent(user.id)}&limit=1`,
    );
    let profile = rows[0];
    if (!profile) {
      profile = await callRpc('nexora_ensure_participant');
      if (!profile?.user_id || profile.user_id !== user.id) {
        throw new Error('No se pudo crear la ficha segura de esta cuenta.');
      }
    }

    profileAvatarPath = profile.avatar_path || '';
    profileAdminBadge.hidden = true;
    try {
      const access = await selectRows('profiles', `select=is_admin&user_id=eq.${encodeURIComponent(user.id)}&limit=1`);
      profileAdminBadge.hidden = access[0]?.is_admin !== true;
    } catch { /* El rol sigue protegido por Supabase aunque no se pueda mostrar la insignia. */ }
    profileDisplayName.textContent = profile.display_name || 'Participante';
    profileNameInput.value = profile.display_name || '';
    profileNameInput.disabled = false;
    profileNameSaveButton.disabled = false;
    profileNameStatus.textContent = 'El nombre solo cambia cómo apareces; no modifica tus permisos.';
    profileAvatarImage.alt = `Foto de perfil de ${profile.display_name || 'participante'}`;
    profileAvatarImage.hidden = true;
    profileAvatarFallback.hidden = false;

    let imageError = '';
    if (profileAvatarPath) {
      try {
        const signed = await signedObjectUrls([profileAvatarPath]);
        const imageUrl = signed.find((entry) => entry.path === profileAvatarPath)?.signedURL;
        if (!imageUrl) throw new Error('Supabase no devolvió la vista previa de la foto.');
        profileAvatarImage.src = imageUrl;
        profileAvatarImage.hidden = false;
        profileAvatarFallback.hidden = true;
      } catch (error) {
        imageError = error.message;
      }
    }

    profilePhotoButton.textContent = profileAvatarPath ? 'Cambiar foto de perfil' : 'Elegir foto de perfil';
    profilePhotoButton.disabled = false;
    profilePhotoStatus.textContent = imageError
      ? `No se pudo mostrar la foto guardada: ${imageError}. Puedes elegir otra para reemplazarla.`
      : profileAvatarPath
        ? 'Tu foto de perfil está cargada.'
        : 'Aún no has subido una foto de perfil.';
  } catch (error) {
    profileAvatarPath = '';
    profileDisplayName.textContent = 'Tu perfil de invitado';
    profileNameInput.value = '';
    const message = error.status === 404 && error.message.includes('nexora_ensure_participant')
      ? 'Falta ejecutar 20261126_nexora_repair_participant_profiles.sql en Supabase.'
      : error.message;
    profileNameStatus.textContent = `No se pudo cargar tu nombre: ${message}`;
    profilePhotoStatus.textContent = `No se pudo cargar tu perfil: ${message}`;
  }
}

function bindProfileName() {
  profileNameSaveButton.addEventListener('click', saveProfileName);
}

async function saveProfileName() {
  const user = currentUser();
  const name = profileNameInput.value.trim();
  if (!user?.id) {
    profileNameStatus.textContent = 'No se encontró una sesión para guardar tu nombre.';
    return;
  }
  if (!name || name.length > 60) {
    profileNameStatus.textContent = 'Escribe un nombre de entre 1 y 60 caracteres.';
    return;
  }
  if (profileNamePending) return;

  profileNamePending = true;
  profileNameSaveButton.disabled = true;
  profileNameSaveButton.textContent = 'Guardando…';
  profileNameStatus.textContent = 'Guardando tu nombre visible…';
  try {
    const updated = await updateRows(
      'trip_participants',
      `user_id=eq.${encodeURIComponent(user.id)}`,
      { display_name: name },
    );
    if (!updated?.length) throw new Error('No se guardaron los cambios del perfil.');
    profileDisplayName.textContent = name;
    profileAvatarImage.alt = `Foto de perfil de ${name}`;
    profileNameStatus.textContent = 'Nombre actualizado. Este cambio no modifica permisos.';
    await loadPhotoLeaderboard();
  } catch (error) {
    profileNameStatus.textContent = `No se pudo guardar el nombre: ${error.message}`;
  } finally {
    profileNamePending = false;
    profileNameSaveButton.disabled = false;
    profileNameSaveButton.textContent = 'Guardar nombre';
  }
}

function bindProfilePhoto() {
  profilePhotoButton.addEventListener('click', () => {
    if (!profilePhotoButton.disabled && !profilePhotoPending) profilePhotoInput.click();
  });
  profilePhotoInput.addEventListener('change', () => {
    const file = profilePhotoInput.files?.[0];
    if (file) prepareProfilePhoto(file);
  });
  profileCropZoom.addEventListener('input', updateProfileCropPreview);
  profileCropCancel.addEventListener('click', clearProfilePhotoCrop);
  profileCropSave.addEventListener('click', saveProfilePhotoCrop);
  copyProfileAccountId.addEventListener('click', async () => {
    const userId = currentUser()?.id;
    if (!userId) return;
    try {
      await navigator.clipboard.writeText(userId);
      copyProfileAccountId.textContent = '¡Copiado!';
      window.setTimeout(() => { copyProfileAccountId.textContent = 'Copiar ID'; }, 1800);
    } catch {
      profilePhotoStatus.textContent = 'No pude copiarlo automáticamente. Selecciona el ID de arriba y cópialo.';
    }
  });
  onlineStatus.addEventListener('click', refreshOnlineCount);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) refreshOnlineCount();
  });
  profileAvatarImage.addEventListener('error', () => {
    profileAvatarImage.hidden = true;
    profileAvatarFallback.hidden = false;
    profilePhotoStatus.textContent = 'No se pudo mostrar la foto guardada. Puedes elegir otra para reemplazarla.';
  });
}

function startOnlinePresence() {
  if (onlinePresenceTimer) return;
  refreshOnlineCount();
  onlinePresenceTimer = window.setInterval(refreshOnlineCount, 20_000);
}

async function refreshOnlineCount() {
  if (!currentUser()?.id || onlinePresencePending) return;
  onlinePresencePending = true;
  onlineStatus.disabled = true;
  try {
    const count = Number(await callRpc('nexora_ping_presence'));
    onlineCount.textContent = Number.isFinite(count) ? String(count) : '—';
    onlineStatus.title = `${onlineCount.textContent} ${count === 1 ? 'persona conectada' : 'personas conectadas'}`;
    onlineStatus.setAttribute('aria-label', `Actualizar personas conectadas. Ahora hay ${onlineCount.textContent}.`);
  } catch {
    onlineCount.textContent = '—';
    onlineStatus.title = 'Aplica la migración de presencia en Supabase para activar el contador.';
    onlineStatus.setAttribute('aria-label', 'Contador no disponible. Revisa la migración de presencia en Supabase.');
  } finally {
    onlinePresencePending = false;
    onlineStatus.disabled = false;
  }
}

function prepareProfilePhoto(file) {
  const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
  if (!allowedTypes.has(file.type)) {
    profilePhotoStatus.textContent = 'Elige una imagen JPG, PNG, WebP o GIF.';
    profilePhotoInput.value = '';
    return;
  }
  if (file.size > 8 * 1024 * 1024) {
    profilePhotoStatus.textContent = 'La foto de perfil debe pesar 8 MB o menos.';
    profilePhotoInput.value = '';
    return;
  }
  if (profileCropUrl) URL.revokeObjectURL(profileCropUrl);
  profileCropFile = file;
  profileCropUrl = URL.createObjectURL(file);
  profileCropPreview.src = profileCropUrl;
  profileCropZoom.value = '100';
  updateProfileCropPreview();
  profileCropPanel.hidden = false;
  profilePhotoStatus.textContent = 'Ajusta el zoom y guarda para subir tu foto.';
}

function updateProfileCropPreview() {
  const zoom = Number(profileCropZoom.value) / 100;
  profileCropPreview.style.transform = `scale(${zoom})`;
  profileCropZoomValue.value = `${profileCropZoom.value}%`;
  profileCropZoomValue.textContent = `${profileCropZoom.value}%`;
}

function clearProfilePhotoCrop() {
  profileCropPanel.hidden = true;
  profileCropPreview.removeAttribute('src');
  profileCropFile = null;
  if (profileCropUrl) URL.revokeObjectURL(profileCropUrl);
  profileCropUrl = '';
  profilePhotoInput.value = '';
}

async function saveProfilePhotoCrop() {
  if (!profileCropFile || profilePhotoPending) return;
  profileCropSave.disabled = true;
  profileCropCancel.disabled = true;
  profilePhotoStatus.textContent = 'Preparando el recorte…';
  try {
    const bitmap = await createImageBitmap(profileCropFile);
    const side = Math.min(bitmap.width, bitmap.height) / (Number(profileCropZoom.value) / 100);
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('No se pudo preparar la imagen en este navegador.');
    context.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, 512, 512);
    bitmap.close();
    const blob = await new Promise((resolve, reject) => canvas.toBlob((result) => result ? resolve(result) : reject(new Error('No se pudo generar el recorte.')), 'image/jpeg', 0.88));
    const croppedFile = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
    await uploadProfilePhoto(croppedFile);
  } catch (error) {
    profilePhotoStatus.textContent = `No se pudo preparar la foto: ${error.message}`;
  } finally {
    profileCropSave.disabled = false;
    profileCropCancel.disabled = false;
  }
}

async function uploadProfilePhoto(file) {
  const user = currentUser();
  const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
  if (!user?.id) {
    profilePhotoStatus.textContent = 'No se encontró una sesión para subir la foto.';
    return;
  }
  if (!allowedTypes.has(file.type)) {
    profilePhotoStatus.textContent = 'Elige una imagen JPG, PNG, WebP o GIF.';
    profilePhotoInput.value = '';
    return;
  }
  if (file.size > 8 * 1024 * 1024) {
    profilePhotoStatus.textContent = 'La foto de perfil debe pesar 8 MB o menos.';
    profilePhotoInput.value = '';
    return;
  }
  if (profilePhotoPending) return;

  profilePhotoPending = true;
  profilePhotoButton.disabled = true;
  profilePhotoButton.textContent = 'Subiendo foto…';
  profilePhotoStatus.textContent = 'Subiendo y guardando tu foto de perfil…';
  const storagePath = `${user.id}/avatar/${crypto.randomUUID()}.${extensionFor(file)}`;
  let uploaded = false;
  try {
    await uploadPrivateObject(storagePath, file);
    uploaded = true;
    const signed = await signedObjectUrls([storagePath]);
    const imageUrl = signed.find((entry) => entry.path === storagePath)?.signedURL;
    if (!imageUrl) throw new Error('Supabase no devolvió la vista previa de la foto.');

    const updated = await updateRows(
      'trip_participants',
      `user_id=eq.${encodeURIComponent(user.id)}`,
      { avatar_path: storagePath },
    );
    if (!updated.length) throw new Error('No se pudo guardar la foto en tu perfil.');

    const previousPath = profileAvatarPath;
    profileAvatarPath = storagePath;
    profileAvatarImage.src = imageUrl;
    profileAvatarImage.alt = `Foto de perfil de ${profileDisplayName.textContent}`;
    profileAvatarImage.hidden = false;
    profileAvatarFallback.hidden = true;
    profilePhotoButton.textContent = 'Cambiar foto de perfil';

    let cleanupMessage = '';
    if (previousPath && previousPath !== storagePath) {
      try {
        await removePrivateObjects([previousPath]);
      } catch (error) {
        cleanupMessage = ` La foto anterior no se pudo borrar: ${error.message}`;
      }
    }
    profilePhotoStatus.textContent = `Foto de perfil actualizada.${cleanupMessage}`;
    clearProfilePhotoCrop();
  } catch (error) {
    let cleanupMessage = '';
    if (uploaded) {
      try {
        await removePrivateObjects([storagePath]);
      } catch (cleanupError) {
        cleanupMessage = ` No se pudo limpiar el archivo temporal: ${cleanupError.message}`;
      }
    }
    profilePhotoStatus.textContent = `No se pudo actualizar la foto: ${error.message}.${cleanupMessage}`;
  } finally {
    profilePhotoPending = false;
    profilePhotoButton.disabled = false;
    profilePhotoButton.textContent = profileAvatarPath ? 'Cambiar foto de perfil' : 'Elegir foto de perfil';
    profilePhotoInput.value = '';
  }
}

function rewardErrorMessage(error) {
  if (error.status === 404 && error.message.includes('nexora_claim_coin_reward')) {
    return `Falta ejecutar 20261122_nexora_nexacoins.sql en Supabase para activar las recompensas. (${error.message})`;
  }
  return `No se pudo activar la recompensa NexaCoins: ${error.message}`;
}

async function loadPhotoLeaderboard() {
  photoLeaderboard.setAttribute('aria-busy', 'true');
  photoLeaderboardStatus.textContent = 'Cargando posiciones…';
  try {
    const [participants, photos] = await Promise.all([
      selectAllRows('trip_participants', 'select=user_id,display_name&order=display_name.asc'),
      selectAllRows('memories', 'select=user_id&media_type=eq.image&status=eq.approved&order=id.asc'),
    ]);
    const photoCounts = new Map(participants.map((participant) => [participant.user_id, 0]));
    photos.forEach((photo) => {
      if (photoCounts.has(photo.user_id)) photoCounts.set(photo.user_id, photoCounts.get(photo.user_id) + 1);
    });
    const entries = participants
      .map((participant) => ({
        user_id: participant.user_id,
        display_name: participant.display_name,
        photo_count: photoCounts.get(participant.user_id),
      }))
      .sort((left, right) => right.photo_count - left.photo_count
        || left.display_name.localeCompare(right.display_name, 'es'));
    let previousCount = null;
    let position = 0;
    entries.forEach((entry, index) => {
      if (index === 0 || entry.photo_count !== previousCount) {
        position = index + 1;
        previousCount = entry.photo_count;
      }
      entry.rank_number = position;
    });
    renderPhotoLeaderboard(entries);
    photoLeaderboardStatus.textContent = entries.length
      ? 'Ranking histórico · solo cuentan las fotos aprobadas.'
      : 'Aún no hay participantes en el ranking.';
  } catch (error) {
    photoLeaderboard.replaceChildren();
    photoLeaderboardStatus.textContent = `No se pudo cargar el ranking: ${error.message}`;
  } finally {
    photoLeaderboard.setAttribute('aria-busy', 'false');
  }
}

async function loadOwnPhotos() {
  const user = currentUser();
  ownPhotoGrid.setAttribute('aria-busy', 'true');
  if (!user?.id) {
    ownPhotos = [];
    renderOwnPhotos();
    ownPhotosStatus.textContent = 'Conecta tu cuenta para ver tus fotos.';
    ownPhotoGrid.setAttribute('aria-busy', 'false');
    return;
  }

  ownPhotosStatus.textContent = 'Cargando tus fotos…';
  try {
    const userId = encodeURIComponent(user.id);
    const rows = await selectAllRows(
      'memories',
      `select=id,user_id,storage_path,caption,status,created_at&user_id=eq.${userId}&media_type=eq.image&order=created_at.desc`,
    );
    let signedUrls = [];
    let previewError = '';
    try {
      signedUrls = await signedObjectUrls(rows.map((row) => row.storage_path));
    } catch (error) {
      previewError = error.message;
    }
    const urlsByPath = new Map(signedUrls.map((entry) => [entry.path, entry.signedURL]));
    ownPhotos = rows.map((row) => ({ ...row, signedUrl: urlsByPath.get(row.storage_path) || '' }));
    renderOwnPhotos();
    ownPhotosStatus.textContent = ownPhotos.length
      ? previewError
        ? `Tus fotos cargaron, pero no se pudieron mostrar algunas vistas previas: ${previewError}`
        : 'Aquí puedes revisar o eliminar las fotos que subiste.'
      : 'Aún no has subido fotos. Cuando lo hagas, aparecerán aquí.';
  } catch (error) {
    ownPhotos = [];
    renderOwnPhotos();
    ownPhotosStatus.textContent = `No se pudieron cargar tus fotos: ${error.message}`;
  } finally {
    ownPhotoGrid.setAttribute('aria-busy', 'false');
  }
}

function renderOwnPhotos() {
  ownPhotoCount.textContent = formatNumber(ownPhotos.length);
  ownPhotoGrid.replaceChildren(...ownPhotos.map((photo) => {
    const card = document.createElement('article');
    card.className = 'own-photo-card';
    card.setAttribute('role', 'listitem');

    const art = document.createElement('div');
    art.className = 'own-photo-art';
    if (photo.signedUrl) {
      const image = document.createElement('img');
      image.src = photo.signedUrl;
      image.alt = photo.caption || 'Foto que subiste';
      image.loading = 'lazy';
      image.decoding = 'async';
      art.append(image);
    } else {
      const placeholder = document.createElement('span');
      placeholder.textContent = 'Vista previa no disponible';
      art.append(placeholder);
    }

    const details = document.createElement('div');
    details.className = 'own-photo-details';
    const statusLabels = { pending: 'En revisión', approved: 'Aprobada', rejected: 'No aprobada' };
    const status = document.createElement('span');
    status.className = `own-photo-status own-photo-status--${statusLabels[photo.status] ? photo.status : 'unknown'}`;
    status.textContent = statusLabels[photo.status] || 'Estado desconocido';
    const caption = document.createElement('p');
    caption.className = 'own-photo-caption';
    caption.textContent = photo.caption || 'Sin descripción';
    const date = document.createElement('time');
    date.className = 'own-photo-date';
    date.dateTime = photo.created_at || '';
    const createdAt = new Date(photo.created_at);
    date.textContent = Number.isNaN(createdAt.getTime())
      ? ''
      : new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }).format(createdAt);
    const button = document.createElement('button');
    button.className = 'own-photo-delete';
    button.type = 'button';
    button.dataset.deletePhoto = photo.id;
    button.disabled = Boolean(deletingPhotoId);
    button.setAttribute('aria-label', `Eliminar foto: ${photo.caption || 'sin descripción'}`);
    button.textContent = deletingPhotoId === photo.id ? 'Eliminando…' : 'Eliminar foto';
    details.append(status, caption, date, button);
    card.append(art, details);
    return card;
  }));
  staggerEntries(ownPhotoGrid);
}

function bindPhotoManagement() {
  ownPhotoGrid.addEventListener('click', (event) => {
    const button = event.target.closest('[data-delete-photo]');
    if (!button || button.disabled) return;
    const photo = ownPhotos.find((entry) => entry.id === button.dataset.deletePhoto);
    if (photo) deleteOwnPhoto(photo);
  });
}

async function deleteOwnPhoto(photo) {
  const user = currentUser();
  if (!user?.id || photo.user_id !== user.id) {
    ownPhotosStatus.textContent = 'Solo puedes eliminar las fotos de esta cuenta.';
    return;
  }
  if (deletingPhotoId || !window.confirm('¿Eliminar esta foto? Esta acción no se puede deshacer.')) return;

  deletingPhotoId = photo.id;
  renderOwnPhotos();
  try {
    const deleted = await deleteRows(
      'memories',
      `id=eq.${encodeURIComponent(photo.id)}&user_id=eq.${encodeURIComponent(user.id)}&select=id,storage_path`,
      { returning: 'representation' },
    );
    if (!deleted.length) throw new Error('No se encontró la foto o ya no pertenece a esta cuenta.');

    ownPhotos = ownPhotos.filter((entry) => entry.id !== photo.id);
    renderOwnPhotos();
    try {
      await removePrivateObjects([deleted[0].storage_path]);
      ownPhotosStatus.textContent = 'Foto eliminada correctamente.';
    } catch (error) {
      ownPhotosStatus.textContent = `La publicación se eliminó, pero no se pudo borrar el archivo privado: ${error.message}`;
    }
    await loadPhotoLeaderboard();
  } catch (error) {
    ownPhotosStatus.textContent = `No se pudo eliminar la foto: ${error.message}`;
  } finally {
    deletingPhotoId = '';
    renderOwnPhotos();
  }
}

async function selectAllRows(table, query) {
  const pageSize = 1000;
  const rows = [];
  for (let offset = 0; ; offset += pageSize) {
    const page = await selectRows(table, `${query}&limit=${pageSize}&offset=${offset}`);
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
}

function renderPhotoLeaderboard(entries) {
  const userId = currentUser()?.id;
  photoLeaderboard.replaceChildren(...entries.map((entry, index) => {
    const position = Number(entry.rank_number) || index + 1;
    const name = entry.display_name || 'Participante';
    const row = document.createElement('article');
    row.className = `leaderboard-entry${position <= 3 ? ` leaderboard-entry--rank-${position}` : ''}${entry.user_id === userId ? ' is-current-user' : ''}`;
    row.setAttribute('role', 'listitem');
    const badge = document.createElement('span');
    badge.className = 'leaderboard-position';
    badge.textContent = String(position).padStart(2, '0');
    const identity = document.createElement('div');
    identity.className = 'leaderboard-identity';
    const avatar = document.createElement('span');
    avatar.className = 'leaderboard-avatar';
    avatar.setAttribute('aria-hidden', 'true');
    avatar.textContent = [...name.trim()][0]?.toLocaleUpperCase('es-CO') || 'N';
    const nameBlock = document.createElement('span');
    nameBlock.className = 'leaderboard-name-block';
    const displayName = document.createElement('strong');
    displayName.textContent = name;
    nameBlock.append(displayName);
    if (entry.user_id === userId) {
      const you = document.createElement('small');
      you.className = 'leaderboard-you';
      you.textContent = 'TÚ';
      nameBlock.append(you);
    }
    identity.append(avatar, nameBlock);
    const score = document.createElement('div');
    score.className = 'leaderboard-score';
    const count = document.createElement('strong');
    count.textContent = formatNumber(entry.photo_count);
    const label = document.createElement('small');
    label.textContent = Number(entry.photo_count) === 1 ? 'FOTO' : 'FOTOS';
    score.append(count, label);
    row.append(badge, identity, score);
    return row;
  }));
  staggerEntries(photoLeaderboard);
}

function showConnectionError(message) {
  storeStatus.textContent = message;
  uploadStatus.textContent = message;
  publishPhotoButton.disabled = true;
  setRewardCountdown(message);
}

async function loadMarket() {
  const user = currentUser();
  if (!user?.id) throw new Error('No hay una sesión de invitado activa.');
  const userId = encodeURIComponent(user.id);
  const [items, collectibles, profile, owned] = await Promise.all([
    selectRows('store_items', 'select=id,name,description,price,rarity,preview_style,category&active=eq.true&category=eq.frame&order=price.asc'),
    selectRows('store_items', 'select=id,slug,name,description,price,rarity,category&active=eq.true&category=eq.collectible&order=slug.asc'),
    selectRows('profiles', `select=coin_balance,last_coin_reward_at&user_id=eq.${userId}`),
    selectRows('user_inventory', `select=item_id&user_id=eq.${userId}`),
  ]);
  marketItems = items;
  collectibleItems = collectibles;
  const inventoryIds = new Set(owned.map((entry) => entry.item_id));
  ownedFrameIds = new Set(marketItems.filter((item) => inventoryIds.has(item.id)).map((item) => item.id));
  ownedCollectibleIds = new Set(collectibleItems.filter((item) => inventoryIds.has(item.id)).map((item) => item.id));
  coinBalance = Number(profile[0]?.coin_balance || 0);
  nextRewardAt = profile[0]?.last_coin_reward_at
    ? Date.parse(profile[0].last_coin_reward_at) + 10 * 60 * 1000
    : 0;
  populateOwnedFrames();
  renderFrameCatalog();
  renderCollectibles();
  renderOwnedCollectibles();
  renderWallet();
  storeStatus.textContent = 'Compra marcos y figuritas con NexaCoins. Recibes 10 cada 10 minutos.';
}

function populateOwnedFrames() {
  const previous = frameSelect.value;
  frameSelect.replaceChildren(new Option('Sin marco', ''));
  marketItems.filter((item) => ownedFrameIds.has(item.id)).forEach((item) => {
    frameSelect.add(new Option(item.name, item.id));
  });
  frameSelect.value = ownedFrameIds.has(previous) ? previous : '';
  renderPhotoPreview();
}

function renderWallet() {
  const balance = `${formatNumber(coinBalance)} NX`;
  document.querySelector('#coinBalance').textContent = balance;
  storeCoinBalance.textContent = balance;
}

function setRewardCountdown(message) {
  rewardCountdown.textContent = message;
  storeRewardCountdown.textContent = message;
}

async function claimCoinReward() {
  if (rewardRequestPending || !currentUser()) return;
  rewardRequestPending = true;
  try {
    const result = await callRpc('nexora_claim_coin_reward');
    coinBalance = Number(result.balance);
    nextRewardAt = Date.parse(result.next_at);
    renderWallet();
    if (Number(result.awarded) > 0) {
      setRewardCountdown(`+${formatNumber(result.awarded)} NX · recompensa recibida`);
    }
  } finally {
    rewardRequestPending = false;
  }
}

function updateCoinReward() {
  if (!currentUser()) return;
  if (!nextRewardAt || Date.now() >= nextRewardAt) {
    claimCoinReward().catch((error) => {
      setRewardCountdown(rewardErrorMessage(error));
      nextRewardAt = Date.now() + 30_000;
    });
    return;
  }
  const seconds = Math.ceil((nextRewardAt - Date.now()) / 1000);
  setRewardCountdown(`Próximas 10 NX en ${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`);
}

async function publishPhoto(event) {
  event.preventDefault();
  const user = currentUser();
  const file = photoInput.files?.[0];
  if (!user?.id) { uploadStatus.textContent = 'Conecta tu cuenta antes de publicar.'; return; }
  if (!file || !file.type.startsWith('image/')) { uploadStatus.textContent = 'Elige una fotografía válida.'; return; }
  if (file.size > 12 * 1024 * 1024) { uploadStatus.textContent = 'La fotografía debe pesar menos de 12 MB.'; return; }
  const frameId = frameSelect.value || null;
  if (frameId && !ownedFrameIds.has(frameId)) {
    uploadStatus.textContent = 'No puedes aplicar un marco que no hayas comprado.';
    return;
  }

  publishPhotoButton.disabled = true;
  uploadStatus.textContent = 'Subiendo tu fotografía privada…';
  const storagePath = `${user.id}/${crypto.randomUUID()}.${extensionFor(file)}`;
  let uploaded = false;
  try {
    await uploadPrivateObject(storagePath, file);
    uploaded = true;
    await insertRow('memories', {
      user_id: user.id,
      storage_path: storagePath,
      media_type: 'image',
      caption: captionInput.value.trim(),
      frame_item_id: frameId,
    });
    photoUploadForm.reset();
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = '';
    document.querySelector('#fileLabel').textContent = 'Elegir fotografía';
    renderPhotoPreview();
    uploadStatus.textContent = 'Foto enviada para revisión. El marco quedará guardado con tu recuerdo.';
    await Promise.all([loadPhotoLeaderboard(), loadOwnPhotos()]);
  } catch (error) {
    let cleanupError = '';
    if (uploaded) {
      try {
        await removePrivateObjects([storagePath]);
      } catch (cleanup) {
        cleanupError = ` No se pudo limpiar el archivo temporal: ${cleanup.message}`;
      }
    }
    uploadStatus.textContent = `No se pudo publicar la foto: ${error.message}.${cleanupError}`;
  } finally {
    publishPhotoButton.disabled = false;
  }
}

function extensionFor(file) {
  const extensions = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };
  if (extensions[file.type]) return extensions[file.type];
  const match = file.name.match(/\.([a-z0-9]{1,8})$/i);
  return match ? match[1].toLowerCase() : 'bin';
}

function formatNumber(value) {
  return new Intl.NumberFormat('es-CO').format(Number(value) || 0);
}
