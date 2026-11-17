import { initMarket } from './market.js';
import {
  callRpc, currentUser, deleteRows, insertRow, isSupabaseConfigured, removePrivateObjects,
  restoreSession, selectRows, signedObjectUrls,
  updateRows, uploadPrivateObject,
} from './supabase.js';

const vfx = window.NexoraVfx;
const STORAGE_KEY = 'nexora-melgar-album-v1';
const TRIP_START = '2026-11-20T00:00:00-05:00';
const RANKS = ['Rookie', 'Explorer', 'Adventurer', 'Photographer', 'Elite Traveler', 'Nexora Legend'];
const STORE_ITEMS = [
  { id: 'crimson', name: 'Crimson Frame', price: 100, style: 'crimson' }, { id: 'gold', name: 'Luxury Gold', price: 150, style: 'gold' },
  { id: 'neon', name: 'Neon Red', price: 200, style: 'neon' }, { id: 'glass', name: 'Glass Premium', price: 250, style: 'glass' },
  { id: 'melgar', name: 'Melgar Edition', price: 300, style: 'melgar' }, { id: 'memories', name: 'Memories Forever', price: 400, style: 'memories' },
  { id: 'exclusive', name: 'Nexora Exclusive · LIMITED EDITION', price: 500, style: 'exclusive' },
];

const defaultState = {
  trip: {
    title: 'MELGAR',
    tagline: 'Amigos, mejora y logra.',
    location: 'Club de la Policía, Melgar, Colombia',
    dateLabel: '20 de noviembre de 2026',
    startAt: TRIP_START,
    endAt: '',
  },
  participants: Array.from({ length: 10 }, (_, index) => ({
    id: `persona-${index + 1}`,
    name: `Persona ${index + 1}`,
    role: index === 0 ? 'Propietario · manchi' : 'Participante',
    description: 'Perfil inicial; añade aquí tus datos y recuerdos cuando quieras.',
  })),
  memories: [],
  activities: [],
  messages: [],
  donations: {
    goal: 0,
    raised: 0,
    count: 0,
    methods: [],
    note: 'La información de donaciones todavía no está configurada.',
  },
  game: {
    activeParticipant: 'persona-1', profiles: {}, history: [],
    missions: [
      { id: 'first-memory', title: 'El primer recuerdo', description: 'Publica tu primera fotografía aprobada.', reward: 25, xp: 30, goal: 1, kind: 'photos', unique: true },
      { id: 'melgar-explorer', title: 'Explorador de Melgar', description: 'Comparte tres fotos aprobadas con #Melgar.', reward: 50, xp: 60, goal: 3, kind: 'melgar', unique: true },
      { id: 'photographer', title: 'Fotógrafo oficial', description: 'Consigue cinco fotografías aprobadas.', reward: 75, xp: 80, goal: 5, kind: 'photos', unique: true },
      { id: 'daily-pool', title: 'Día de piscina', description: 'Comparte un recuerdo con #Piscina.', reward: 35, xp: 40, goal: 1, kind: 'piscina', daily: true },
      { id: 'secret', title: '??? Misión desconocida', description: 'Un secreto espera en tus recuerdos.', reward: 100, xp: 120, goal: 1, kind: 'secret', unique: true, secret: true },
    ],
  },
};

const state = loadState();

const app = {
  authGate: document.querySelector('#authGate'),
  authRetryButton: document.querySelector('#authRetryButton'),
  authStatus: document.querySelector('#authStatus'),
  memoryFrameId: document.querySelector('#memoryFrameId'),
  uploadPreview: document.querySelector('#uploadPreview'),
  uploadPreviewImage: document.querySelector('#uploadPreviewImage'),
  uploadPreviewVideo: document.querySelector('#uploadPreviewVideo'),
  uploadFramePreview: document.querySelector('#uploadFramePreview'),
  galleryDateFilter: document.querySelector('#galleryDateFilter'),
  loadMoreMemories: document.querySelector('#loadMoreMemories'),
  personalGallery: document.querySelector('#personalGallery'),
  siteShell: document.querySelector('#siteShell'),
  tripTitle: document.querySelector('#tripTitle'),
  tripTagline: document.querySelector('#tripTagline'),
  tripLocation: document.querySelector('#tripLocation'),
  tripDate: document.querySelector('#tripDate'),
  galleryGrid: document.querySelector('#galleryGrid'),
  participantsList: document.querySelector('#participantsList'),
  activityList: document.querySelector('#activityList'),
  timelineList: document.querySelector('#timelineList'),
  messagesList: document.querySelector('#messagesList'),
  messageForm: document.querySelector('#messageForm'),
  messageInput: document.querySelector('#messageInput'),
  uploadForm: document.querySelector('#uploadForm'),
  fileInput: document.querySelector('#fileInput'),
  cameraPhotoInput: document.querySelector('#cameraPhotoInput'),
  cameraVideoInput: document.querySelector('#cameraVideoInput'),
  selectedUploadLabel: document.querySelector('#selectedUploadLabel'),
  uploadChoiceSheet: document.querySelector('#uploadChoiceSheet'),
  profileEditForm: document.querySelector('#profileEditForm'),
  profileNameInput: document.querySelector('#profileNameInput'),
  profileImageInput: document.querySelector('#profileImageInput'),
  profileDescriptionInput: document.querySelector('#profileDescriptionInput'),
  profileAuraInput: document.querySelector('#profileAuraInput'),
  participantForm: document.querySelector('#participantForm'),
  participantName: document.querySelector('#participantName'),
  participantRole: document.querySelector('#participantRole'),
  donationGoal: document.querySelector('#donationGoal'),
  donationRaised: document.querySelector('#donationRaised'),
  donationProgress: document.querySelector('#donationProgress'),
  donationCount: document.querySelector('#donationCount'),
  viewerModal: document.querySelector('#viewerModal'),
  viewerContent: document.querySelector('#viewerContent'),
  tripCounter: document.querySelector('#tripCounter'),
  counterTitle: document.querySelector('#counterTitle'),
  counterEyebrow: document.querySelector('#counterEyebrow'),
  counterNote: document.querySelector('#counterNote'),
  activeParticipant: document.querySelector('#activeParticipant'),
  profileParticipant: document.querySelector('#profileParticipant'),
  memoryParticipant: document.querySelector('#memoryParticipant'),
  memoryCaption: document.querySelector('#memoryCaption'),
  memoryHashtags: document.querySelector('#memoryHashtags'),
  playerProfile: document.querySelector('#playerProfile'),
  questList: document.querySelector('#questList'),
  pointHistory: document.querySelector('#pointHistory'),
  storeGrid: document.querySelector('#storeGrid'),
  leaderboardList: document.querySelector('#leaderboardList'),
  tripSettingsForm: document.querySelector('#tripSettingsForm'),
  tripEndAt: document.querySelector('#tripEndAt'),
  mobileUploadButton: document.querySelector('#mobileUploadButton'),
  homeFeatureImage: document.querySelector('#homeFeatureImage'),
  homePhotoBackdrop: document.querySelector('#homePhotoBackdrop'),
  homePhotoEmpty: document.querySelector('#homePhotoEmpty'),
  homePhotoCaption: document.querySelector('#homePhotoCaption'),
  homeMemoryCount: document.querySelector('#homeMemoryCount'),
  homeParticipantCount: document.querySelector('#homeParticipantCount'),
  galleryResultCount: document.querySelector('#galleryResultCount'),
  galleryParticipantFilter: document.querySelector('#galleryParticipantFilter'),
  galleryTagFilter: document.querySelector('#galleryTagFilter'),
};

let galleryFilter = 'all';
let selectedUploadFiles = [];
let uploadPreviewUrl = '';
let rewardMessageUntil = 0;
let adminNavLink;

function showToast(message, { type = 'info', duration = 3600 } = {}) {
  const container = document.querySelector('#toastContainer') || (() => {
    const node = document.createElement('div');
    node.id = 'toastContainer';
    node.className = 'toast-container';
    node.setAttribute('aria-live', 'polite');
    node.setAttribute('aria-atomic', 'true');
    document.body.appendChild(node);
    return node;
  })();
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.textContent = message;
  toast.setAttribute('role', 'status');
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('is-visible'));
  window.setTimeout(() => {
    toast.classList.remove('is-visible');
    window.setTimeout(() => toast.remove(), 200);
  }, duration);
}

function notifySuccess(message) { showToast(message, { type: 'success', duration: 2800 }); }
function notifyError(message) { showToast(message, { type: 'error', duration: 4200 }); }

let appStarted = false;
let connectionRetryBound = false;
let mediaOffset = 0;
let mediaHasMore = false;
let memoryCardObserver;

startNexora();
window.addEventListener('nexora:render-gallery', renderGallery);
window.addEventListener('nexora:frame-catalog-ready', () => { renderGallery(); renderGame(); });

async function startNexora() {
  bindConnectionRetry();
  if (window.location.protocol === 'file:') {
    showAuthGate();
    setAuthStatus('No abras index.html directamente. Instala Node.js 20+, abre una terminal en la carpeta del proyecto, ejecuta “npm install” y luego “npm run dev”. Abre http://localhost:3000/viaje/.', true);
    return;
  }
  if (!isSupabaseConfigured) {
    showAuthGate();
    setAuthStatus('NEXORA necesita conexión con Supabase para crear tu perfil seguro. Configura la URL y la publishable key.', true);
    return;
  }
  try {
    const session = await restoreSession();
    if (session?.user) await enterPrivateApp();
    else throw new Error('No se pudo crear tu perfil de invitado.');
  } catch (error) {
    showAuthGate();
    setAuthStatus(messageForAuthError(error), true);
  }
}

function bindConnectionRetry() {
  if (connectionRetryBound) return;
  connectionRetryBound = true;
  app.authRetryButton?.addEventListener('click', async () => {
    app.authRetryButton.disabled = true;
    setAuthStatus('Conectando con NEXORA…');
    await startNexora();
    app.authRetryButton.disabled = false;
  });
}

function showAuthGate() {
  app.authGate?.classList.remove('hidden');
  app.siteShell?.classList.add('hidden');
}

function setAuthStatus(message, isError = false) {
  if (!app.authStatus) return;
  app.authStatus.textContent = message;
  app.authStatus.dataset.error = String(isError);
}

function messageForAuthError(error) {
  const message = String(error?.message || 'No se pudo completar la solicitud.');
  if (/anonymous|an[oó]nim/i.test(message) && /disabled|enable|not enabled|no cre[oó]/i.test(message)) return 'Activa “Allow anonymous sign-ins” en Supabase → Authentication → Sign In / Providers.';
  if (/INVITE_REQUIRED|invite/i.test(message) || error?.code === '42501') return 'No se aplicó la migración de invitados anónimos en Supabase.';
  if (/Failed to fetch|NetworkError/i.test(message)) return 'No se pudo conectar a Supabase. Revisa la URL y la conexión.';
  return message;
}

async function enterPrivateApp() {
  if (appStarted) return;
  try { await loadPrivateData(); }
  catch (error) {
    showAuthGate();
    setAuthStatus(`No pude cargar el grupo. Aplica la migración privada de Supabase y vuelve a entrar. (${error.message})`, true);
    return;
  }
  appStarted = true;
  app.authGate?.classList.add('hidden');
  app.siteShell?.classList.remove('hidden');
  initialize();
  await initMarket();
  startPrivateSync();
}

function startPrivateSync() {
  window.setInterval(async () => {
    try {
      await loadPrivateData();
      renderParticipants(); renderGallery(); renderHomeFeature(); renderActivities(); renderTimeline(); renderMessages(); renderGame();
      await window.nexoraRefreshMarket?.();
    } catch { /* El siguiente ciclo reintentará sin vaciar la pantalla actual. */ }
  }, 30_000);
}

async function loadPrivateData() {
  const user = currentUser();
  if (!user?.id) throw new Error('Sesión de Supabase no válida.');
  const uid = encodeURIComponent(user.id);
  const [people, media, activities, missions, messages, ownProfile, claims, leaderboard] = await Promise.all([
    selectRows('trip_participants', 'select=user_id,display_name,role,avatar_path,description,aura_style,created_at&order=created_at.asc'),
    selectRows('memories', 'select=id,user_id,storage_path,media_type,caption,hashtags,status,frame_item_id,created_at&order=created_at.desc&limit=24&offset=0'),
    selectRows('trip_activities', 'select=id,title,description,starts_at,active&active=eq.true&order=starts_at.asc.nullslast'),
    selectRows('trip_missions', 'select=id,slug,title,description,reward_np,reward_nc,xp,kind,goal_count,goal_tag,repeat_daily,active&active=eq.true&order=created_at.asc'),
    selectRows('trip_messages', 'select=id,user_id,body,created_at&order=created_at.desc&limit=30'),
    selectRows('profiles', `select=user_id,email,coin_balance,points,xp,is_admin,last_coin_reward_at&user_id=eq.${uid}`),
    selectRows('mission_claims', `select=mission_id,claim_key,trip_missions(slug)&user_id=eq.${uid}`),
    callRpc('nexora_leaderboard'),
  ]);
  mediaOffset = media.length;
  mediaHasMore = media.length === 24;
  const peopleById = new Map(people.map((person) => [person.user_id, person]));
  const allPaths = [...media.map((row) => row.storage_path), ...people.map((person) => person.avatar_path).filter(Boolean)];
  const signed = await signedObjectUrls(allPaths);
  const signedByPath = new Map(signed.map((entry) => [entry.path, entry.signedURL]));
  const memoryIds = media.map((row) => row.id);
  const comments = memoryIds.length
    ? await selectRows('memory_comments', `select=id,memory_id,user_id,author_name,body,created_at,status&status=eq.approved&memory_id=in.(${memoryIds.join(',')})&order=created_at.asc`)
    : [];
  const idsFilter = `(${memoryIds.join(',')})`;
  const [reactions, favorites] = memoryIds.length ? await Promise.all([
    selectRows('memory_reactions', `select=memory_id,user_id,reaction&memory_id=in.${idsFilter}`),
    selectRows('memory_favorites', `select=memory_id,user_id&user_id=eq.${uid}&memory_id=in.${idsFilter}`),
  ]) : [[], []];
  const reactionsByMemory = new Map();
  reactions.forEach((reaction) => {
    const list = reactionsByMemory.get(reaction.memory_id) || [];
    list.push(reaction);
    reactionsByMemory.set(reaction.memory_id, list);
  });
  const commentsByMemory = new Map();
  comments.forEach((comment) => {
    const list = commentsByMemory.get(comment.memory_id) || [];
    list.push({ author: comment.author_name, text: comment.body, createdAt: comment.created_at });
    commentsByMemory.set(comment.memory_id, list);
  });
  const favorited = new Set(favorites.map((item) => item.memory_id));
  state.participants = people.map((person) => ({
    id: person.user_id, name: person.display_name, role: person.role,
    description: person.description || '', auraStyle: person.aura_style || 'none',
    image: signedByPath.get(person.avatar_path) || '', createdAt: person.created_at,
  }));
  state.memories = media.map((row) => ({
    id: row.id, userId: row.user_id, participantId: row.user_id,
    uploader: peopleById.get(row.user_id)?.display_name || 'Integrante',
    type: row.media_type, src: signedByPath.get(row.storage_path) || '', storagePath: row.storage_path,
    caption: row.caption || '', tags: row.hashtags || [], approved: row.status === 'approved',
    frameItemId: row.frame_item_id, uploadedAt: row.created_at,
    comments: commentsByMemory.get(row.id) || [], reactions: reactionsByMemory.get(row.id) || [],
    favorite: favorited.has(row.id),
  }));
  state.activities = activities.map((item) => ({ id: item.id, title: item.title, description: item.description, date: item.starts_at || '' }));
  state.messages = messages.map((item) => ({ id: item.id, author: peopleById.get(item.user_id)?.display_name || 'Integrante', text: item.body, createdAt: item.created_at }));
  state.game.activeParticipant = user.id;
  state.game.missions = missions.map((mission) => ({
    id: mission.slug, dbId: mission.id, title: mission.title, description: mission.description,
    reward: Number(mission.reward_np || 0), coinReward: Number(mission.reward_nc || 0), xp: Number(mission.xp || 0),
    goal: Number(mission.goal_count || 1), kind: mission.goal_tag || 'photos',
    daily: mission.repeat_daily, unique: !mission.repeat_daily, secret: mission.kind === 'secret',
  }));
  state.game.profiles = Object.fromEntries(leaderboard.map((person) => [person.user_id, {
    points: Number(person.points || 0), xp: Number(person.xp || 0), inventory: [], equipped: '', claimed: [], badges: [],
  }]));
  state.game.profiles[user.id] ||= { points: 0, xp: 0, inventory: [], equipped: '', claimed: [], badges: [] };
  const slugsById = new Map(missions.map((mission) => [mission.id, mission.slug]));
  claims.forEach((claim) => {
    const slug = claim.trip_missions?.slug || slugsById.get(claim.mission_id);
    const mission = state.game.missions.find((item) => item.id === slug);
    if (mission) state.game.profiles[user.id].claimed.push(mission.daily ? `${mission.id}:${claim.claim_key}` : mission.id);
  });
  state.currentProfile = ownProfile[0] || null;
  configureAdminAccess(Boolean(state.currentProfile?.is_admin));
  window.nexoraMemberName = peopleById.get(user.id)?.display_name || user.user_metadata?.display_name || 'Participante';
  window.nexoraMemberId = user.id;
  if (app.loadMoreMemories) app.loadMoreMemories.classList.toggle('hidden', !mediaHasMore);
}

async function loadNextMemories() {
  if (!mediaHasMore || app.loadMoreMemories?.disabled) return;
  if (app.loadMoreMemories) { app.loadMoreMemories.disabled = true; app.loadMoreMemories.textContent = 'Cargando…'; }
  try {
    const rows = await selectRows('memories', `select=id,user_id,storage_path,media_type,caption,hashtags,status,frame_item_id,created_at&order=created_at.desc&limit=24&offset=${mediaOffset}`);
    const [signed, people] = await Promise.all([
      signedObjectUrls(rows.map((row) => row.storage_path)),
      selectRows('trip_participants', 'select=user_id,display_name'),
    ]);
    const signedByPath = new Map(signed.map((entry) => [entry.path, entry.signedURL]));
    const peopleById = new Map(people.map((person) => [person.user_id, person.display_name]));
    const memoryIds = rows.map((row) => row.id);
    const comments = memoryIds.length ? await selectRows('memory_comments', `select=memory_id,author_name,body,created_at&status=eq.approved&memory_id=in.(${memoryIds.join(',')})&order=created_at.asc`) : [];
    const commentsByMemory = new Map();
    comments.forEach((comment) => {
      const list = commentsByMemory.get(comment.memory_id) || [];
      list.push({ author: comment.author_name, text: comment.body, createdAt: comment.created_at });
      commentsByMemory.set(comment.memory_id, list);
    });
    const [favorites, reactions] = memoryIds.length ? await Promise.all([
      selectRows('memory_favorites', `select=memory_id&user_id=eq.${encodeURIComponent(currentUser().id)}&memory_id=in.(${memoryIds.join(',')})`),
      selectRows('memory_reactions', `select=memory_id,user_id,reaction&memory_id=in.(${memoryIds.join(',')})`),
    ]) : [[], []];
    const favoriteIds = new Set(favorites.map((item) => item.memory_id));
    const reactionsByMemory = new Map();
    reactions.forEach((reaction) => {
      const list = reactionsByMemory.get(reaction.memory_id) || [];
      list.push(reaction);
      reactionsByMemory.set(reaction.memory_id, list);
    });
    const appended = rows.map((row) => ({
      id: row.id, userId: row.user_id, participantId: row.user_id, uploader: peopleById.get(row.user_id) || 'Integrante',
      type: row.media_type, src: signedByPath.get(row.storage_path) || '', storagePath: row.storage_path,
      caption: row.caption || '', tags: row.hashtags || [], approved: row.status === 'approved', frameItemId: row.frame_item_id,
      uploadedAt: row.created_at, comments: commentsByMemory.get(row.id) || [], favorite: favoriteIds.has(row.id), reactions: reactionsByMemory.get(row.id) || [],
    }));
    state.memories.push(...appended);
    mediaOffset += rows.length;
    mediaHasMore = rows.length === 24;
    renderGallery();
  } catch (error) { notifyError(`No se pudieron cargar más fotos: ${error.message}`); }
  finally {
    if (app.loadMoreMemories) { app.loadMoreMemories.disabled = false; app.loadMoreMemories.textContent = 'Cargar más fotos'; app.loadMoreMemories.classList.toggle('hidden', !mediaHasMore); }
  }
}

function initialize() {
  bindEvents();
  renderHero();
  renderParticipants();
  renderGallery();
  renderHomeFeature();
  renderActivities();
  renderTimeline();
  renderMessages();
  renderDonations();
  renderGame();
  updateTripCounter();
  startActiveRewardClock();
  initPageWindows();
  window.setInterval(updateTripCounter, 1000);
}

function initPageWindows() {
  const panels = [...document.querySelectorAll('#siteShell main > section[id]')];
  const links = [...document.querySelectorAll('.app-navigation a[href^="#"]')];
  if (!panels.length) return;
  panels.forEach((panel) => panel.classList.add('page-window'));
  panels.filter((panel) => panel.id !== 'inicio').forEach((panel) => {
    const backButton = document.createElement('button');
    backButton.type = 'button';
    backButton.className = 'page-window-back';
    backButton.textContent = '← Inicio';
    backButton.setAttribute('aria-label', 'Volver a Inicio');
    backButton.addEventListener('click', () => window.nexoraOpenWindow?.('inicio'));
    panel.prepend(backButton);
  });

  const showWindow = (id, addHistory = true) => {
    const next = panels.find((panel) => panel.id === id);
    if (!next) return false;
    panels.forEach((panel) => {
      panel.hidden = panel !== next;
      panel.classList.remove('page-window--enter');
    });
    void next.offsetWidth;
    next.classList.add('page-window--enter');
    if (id === 'galeria') requestAnimationFrame(observeMemoryCards);
    links.forEach((link) => {
      if (link.hash === `#${id}`) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    if (addHistory && location.hash !== `#${id}`) history.pushState({ nexoraWindow: id }, '', `#${id}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return true;
  };

  window.nexoraOpenWindow = showWindow;
  links.forEach((link) => link.addEventListener('click', (event) => {
    const id = link.hash.slice(1);
    if (!panels.some((panel) => panel.id === id)) return;
    event.preventDefault();
    showWindow(id);
    link.closest('details')?.removeAttribute('open');
  }));

  const initialId = location.hash.slice(1);
  showWindow(panels.some((panel) => panel.id === initialId) ? initialId : 'inicio', false);
  window.addEventListener('popstate', () => {
    const id = location.hash.slice(1);
    showWindow(panels.some((panel) => panel.id === id) ? id : 'inicio', false);
  });
}

function configureAdminAccess(isAdmin) {
  const nav = document.querySelector('.nav.app-navigation');
  if (isAdmin && nav && !adminNavLink) {
    adminNavLink = document.createElement('a');
    adminNavLink.href = '#administracion';
    adminNavLink.innerHTML = '<span>08</span>Administración';
    nav.append(adminNavLink);
  }
  adminNavLink?.classList.toggle('hidden', !isAdmin);
  document.querySelector('#administracion')?.classList.toggle('hidden', !isAdmin);
  document.querySelector('#marketAdmin')?.classList.toggle('hidden', !isAdmin);
}

function observeMemoryCards() {
  const cards = document.querySelectorAll('#galleryGrid .memory-card');
  if (!('IntersectionObserver' in window)) {
    cards.forEach((card) => card.classList.add('is-revealed', 'is-inview'));
    return;
  }
  memoryCardObserver?.disconnect();
  memoryCardObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) entry.target.classList.add('is-revealed', 'is-inview');
      else entry.target.classList.remove('is-inview');
    });
  }, { rootMargin: '100px 0px', threshold: 0.05 });
  cards.forEach((card) => memoryCardObserver.observe(card));
}

function bindEvents() {
  document.querySelectorAll('[data-open-uploader]').forEach((button) => button.addEventListener('click', openUploadChoices));
  document.querySelectorAll('[data-scroll]').forEach((button) => {
    button.addEventListener('click', () => {
      const target = document.getElementById(button.dataset.scroll);
      if (window.nexoraOpenWindow?.(button.dataset.scroll)) return;
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  app.mobileUploadButton?.addEventListener('click', openUploadChoices);
  document.querySelectorAll('[data-close-upload-choice]').forEach((button) => button.addEventListener('click', closeUploadChoices));
  document.querySelector('#chooseMediaButton')?.addEventListener('click', () => chooseUploadSource(app.fileInput));
  document.querySelector('#takePhotoButton')?.addEventListener('click', () => chooseUploadSource(app.cameraPhotoInput));
  document.querySelector('#recordVideoButton')?.addEventListener('click', () => chooseUploadSource(app.cameraVideoInput));
  app.fileInput?.addEventListener('change', () => setSelectedUploadFiles(app.fileInput.files));
  [app.cameraPhotoInput, app.cameraVideoInput].forEach((input) => input?.addEventListener('change', () => {
    if (input.files?.length) {
      showUploadForm();
      setSelectedUploadFiles(input.files);
    }
    input.value = '';
  }));
  document.querySelector('[data-cancel-upload]')?.addEventListener('click', clearUploadDraft);

  if (app.messageForm) {
    app.messageForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const text = app.messageInput.value.trim();
      if (!text) return;
      try {
        await insertRow('trip_messages', { user_id: currentUser().id, body: text });
        state.messages.unshift({ id: crypto.randomUUID(), author: window.nexoraMemberName, text, createdAt: new Date().toISOString() });
        renderMessages(); app.messageForm.reset();
      } catch (error) { notifyError(`No se pudo enviar el mensaje: ${error.message}`); }
    });
  }

  app.profileEditForm?.addEventListener('submit', saveProfileEdits);
  document.querySelector('#inviteForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!state.currentProfile?.is_admin) return;
    const form = event.currentTarget;
    const input = form.querySelector('#inviteEmail');
    const status = form.querySelector('#inviteStatus');
    const button = form.querySelector('[type="submit"]');
    if (button) button.disabled = true;
    if (status) status.textContent = 'Creando invitación…';
    try {
      const expiresAt = await callRpc('nexora_create_invite', { p_email: input.value.trim().toLowerCase() });
      if (status) status.textContent = `Invitación registrada para ${input.value.trim()}; no se envía correo automático. Comparte el enlace de NEXORA. Caduca el ${formatDate(expiresAt)}.`;
      form.reset();
    } catch (error) {
      if (status) status.textContent = /ADMIN_REQUIRED/.test(error.message) ? 'Tu cuenta aún no tiene permisos de administración.' : `No se pudo crear: ${error.message}`;
    } finally { if (button) button.disabled = false; }
  });
  app.memoryFrameId?.addEventListener('change', updateUploadFramePreview);
  app.loadMoreMemories?.addEventListener('click', loadNextMemories);
  app.galleryDateFilter?.addEventListener('change', renderGallery);
  app.galleryGrid?.addEventListener('change', (event) => {
    const select = event.target.closest('[data-memory-frame]');
    if (select) changeMemoryFrame(select.dataset.memoryFrame, select.value || null);
  });
  window.addEventListener('nexora:inventory-ready', () => {
    populateUploadFrames();
    const owned = window.nexoraFrameItems?.() || [];
    const profile = getProfile(currentUser()?.id);
    profile.inventory = owned.map((item) => item.id);
    profile.equipped = window.nexoraEquippedFrameId?.() || '';
    renderGame(); renderGallery();
  });

  if (app.uploadForm) {
    app.uploadForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const files = selectedUploadFiles.length ? [...selectedUploadFiles] : Array.from(app.fileInput?.files || []);
      if (!files.length) return;

      const acceptedFiles = [];
      for (const file of files) {
        const isImage = file.type.startsWith('image/');
        const isVideo = file.type.startsWith('video/');
        if (!isImage && !isVideo) {
          notifyError(`${file.name}: solo se permiten imágenes y videos.`);
          continue;
        }
        const duration = isVideo ? await getVideoDuration(file) : null;
        if (isVideo && duration > 20) {
          notifyError(`${file.name}: los videos deben durar 20 segundos o menos.`);
        } else acceptedFiles.push({ file, duration });
      }
      if (!acceptedFiles.length) return;

      const caption = app.memoryCaption?.value.trim() || 'Recuerdo del viaje';
      const tags = normalizeTags(app.memoryHashtags?.value || '');
      const frameId = app.memoryFrameId?.value || null;
      const userId = currentUser()?.id;
      if (!userId) { notifyError('Inicia sesión para publicar en el álbum privado.'); return; }
      if (frameId && !window.nexoraFrameItems?.().some((item) => item.id === frameId)) {
        notifyError('Ese marco no está en tu inventario.'); return;
      }
      const publishButton = app.uploadForm.querySelector('[type="submit"]');
      if (publishButton) { publishButton.disabled = true; publishButton.textContent = 'Subiendo…'; }
      const uploadedPaths = [];
      const insertedPaths = new Set();
      try {
        for (const { file, duration } of acceptedFiles) {
          const path = `${userId}/${crypto.randomUUID()}.${extensionFor(file)}`;
          uploadedPaths.push(path);
          await uploadPrivateObject(path, file);
          const saved = await insertRow('memories', {
            user_id: userId, storage_path: path,
            media_type: file.type.startsWith('video/') ? 'video' : 'image',
            caption, hashtags: tags, status: 'pending', duration_seconds: duration,
            frame_item_id: frameId,
          });
          if (!saved?.length) throw new Error('Supabase no confirmó la fotografía.');
          insertedPaths.add(path);
        }
        await loadPrivateData();
        renderParticipants(); renderGallery(); renderTimeline(); renderGame();
        app.uploadForm.reset(); selectedUploadFiles = [];
        app.uploadForm.classList.add('hidden'); app.uploadPreview?.classList.add('hidden');
        if (app.selectedUploadLabel) app.selectedUploadLabel.textContent = 'Elige fotos o videos';
        populateUploadFrames();
        notifySuccess('Recuerdo publicado correctamente.');
      } catch (error) {
        const unattached = uploadedPaths.filter((path) => !insertedPaths.has(path));
        if (unattached.length) { try { await removePrivateObjects(unattached); } catch { /* El objeto sigue siendo privado si falla la limpieza. */ } }
        await loadPrivateData().catch(() => {});
        renderGallery();
        notifyError(`No se pudo publicar el recuerdo: ${error.message}`);
      } finally {
        if (publishButton) { publishButton.disabled = false; publishButton.textContent = 'Publicar recuerdo'; }
      }
    });
  }

  document.addEventListener('click', (event) => {
    if (event.target.closest('[data-memory-frame]')) return;
    if (event.target.closest('[data-memory-favorite]')) { toggleMemoryFavorite(event.target.closest('[data-memory-favorite]')); return; }
    if (event.target.closest('[data-memory-reaction]')) { toggleMemoryReaction(event.target.closest('[data-memory-reaction]')); return; }
    if (event.target.closest('[data-game-action]')) return;
    if (event.target.closest('[data-memory-comment]')) return;
    const card = event.target.closest('[data-memory-id]');
    if (!card) return;
    const memory = state.memories.find((item) => item.id === card.dataset.memoryId);
    if (memory) openViewer(memory);
  });

  document.addEventListener('submit', async (event) => {
    const form = event.target.closest('[data-memory-comment]');
    if (!form) return;
    event.preventDefault();
    const memory = state.memories.find((item) => item.id === form.dataset.memoryId);
    const input = form.querySelector('input');
    const text = input?.value.trim();
    if (!memory || !text) return;
    const previous = memory.comments || [];
    try {
      const author = state.participants.find((person) => person.id === currentUser()?.id)?.name || 'Integrante';
      await insertRow('memory_comments', { memory_id: memory.id, user_id: currentUser().id, author_name: author, body: text, status: 'approved' });
      memory.comments = [...previous, { author, text, createdAt: new Date().toISOString() }];
      renderGallery();
    } catch (error) { notifyError(`No se pudo publicar el comentario: ${error.message}`); }
  });

  document.querySelectorAll('[data-close-modal]').forEach((button) => {
    button.addEventListener('click', () => closeViewer());
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') { closeViewer(); closeUploadChoices(); }
  });

  if (app.viewerModal) {
    app.viewerModal.addEventListener('click', (event) => {
      if (event.target === app.viewerModal) closeViewer();
    });
  }

  document.querySelectorAll('[data-gallery-filter]').forEach((button) => button.addEventListener('click', () => {
    galleryFilter = button.dataset.galleryFilter;
    document.querySelectorAll('[data-gallery-filter]').forEach((item) => item.classList.toggle('is-active', item === button));
    renderGallery();
  }));
  app.galleryParticipantFilter?.addEventListener('change', renderGallery);
  app.galleryTagFilter?.addEventListener('input', renderGallery);
  app.tripSettingsForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    const value = app.tripEndAt.value;
    state.trip.endAt = value ? `${value}:00-05:00` : '';
    persistState(); updateTripCounter();
  });

  document.addEventListener('click', (event) => {
    const action = event.target.closest('[data-game-action]');
    if (!action) return;
    const id = action.dataset.id;
    if (action.dataset.gameAction === 'approve') approveMemory(id);
    if (action.dataset.gameAction === 'claim') claimMission(id);
  });
}

function openUploadChoices() {
  app.uploadChoiceSheet?.classList.remove('hidden');
}

function closeUploadChoices() {
  app.uploadChoiceSheet?.classList.add('hidden');
}

function showUploadForm() {
  window.nexoraOpenWindow?.('galeria');
  app.uploadForm?.classList.remove('hidden');
}

function chooseUploadSource(input) {
  if (!input) return;
  closeUploadChoices();
  showUploadForm();
  input.click();
}

function setSelectedUploadFiles(files) {
  selectedUploadFiles = Array.from(files || []);
  if (!selectedUploadFiles.length) return;
  showUploadForm();
  if (app.selectedUploadLabel) {
    app.selectedUploadLabel.textContent = selectedUploadFiles.length === 1
      ? selectedUploadFiles[0].name
      : `${selectedUploadFiles.length} archivos seleccionados`;
  }
  renderUploadPreview(selectedUploadFiles[0]);
}

function renderUploadPreview(file) {
  if (!file || !app.uploadPreview) return;
  if (uploadPreviewUrl) URL.revokeObjectURL(uploadPreviewUrl);
  uploadPreviewUrl = URL.createObjectURL(file);
  app.uploadPreview.classList.remove('hidden');
  const isVideo = file.type.startsWith('video/');
  if (app.uploadPreviewImage) { app.uploadPreviewImage.hidden = isVideo; if (!isVideo) app.uploadPreviewImage.src = uploadPreviewUrl; }
  if (app.uploadPreviewVideo) { app.uploadPreviewVideo.hidden = !isVideo; if (isVideo) app.uploadPreviewVideo.src = uploadPreviewUrl; }
  updateUploadFramePreview();
}

function populateUploadFrames() {
  if (!app.memoryFrameId) return;
  const selected = app.memoryFrameId.value;
  const frames = window.nexoraFrameItems?.() || [];
  app.memoryFrameId.innerHTML = '<option value="">Sin marco</option>' + frames.map((frame) =>
    `<option value="${escapeHtml(frame.id)}">${escapeHtml(frame.name)}</option>`).join('');
  app.memoryFrameId.value = frames.some((frame) => frame.id === selected) ? selected : (frames.find((frame) => frame.id === window.nexoraEquippedFrameId?.())?.id || '');
  updateUploadFramePreview();
}

function updateUploadFramePreview() {
  const frame = (window.nexoraFrameItems?.() || []).find((item) => item.id === app.memoryFrameId?.value);
  if (app.uploadFramePreview) {
    app.uploadFramePreview.className = `upload-frame-preview${frame ? ` upload-frame-preview--${escapeHtml(frame.preview_style)}` : ''}`;
    app.uploadFramePreview.innerHTML = frame
      ? `<span>${escapeHtml(frame.name)} · Vista previa</span>`
      : '<span>Selecciona un marco desbloqueado para verlo aplicado</span>';
  }
  if (!app.uploadPreview) return;
  const media = uploadPreviewUrl && app.uploadPreviewImage && !app.uploadPreviewImage.hidden
    ? app.uploadPreviewImage
    : uploadPreviewUrl && app.uploadPreviewVideo && !app.uploadPreviewVideo.hidden
      ? app.uploadPreviewVideo
      : null;
  const style = vfx.normalizeStyle(frame?.preview_style);
  if (media && style) vfx.mountFrame(app.uploadPreview, style, { content: media });
  else vfx.restoreContent(app.uploadPreview, [app.uploadPreviewImage, app.uploadPreviewVideo]);
}

function clearUploadDraft() {
  app.uploadForm?.reset();
  selectedUploadFiles = [];
  if (uploadPreviewUrl) URL.revokeObjectURL(uploadPreviewUrl);
  uploadPreviewUrl = '';
  app.uploadForm?.classList.add('hidden');
  app.uploadPreview?.classList.add('hidden');
  if (app.selectedUploadLabel) app.selectedUploadLabel.textContent = 'Elige fotos o videos';
  if (app.cameraPhotoInput) app.cameraPhotoInput.value = '';
  if (app.cameraVideoInput) app.cameraVideoInput.value = '';
}

async function saveProfileEdits(event) {
  event.preventDefault();
  const participant = state.participants.find((person) => person.id === currentUser()?.id);
  if (!participant) return;
  const name = app.profileNameInput?.value.trim();
  if (!name) { notifyError('Escribe un nombre para tu perfil.'); return; }
  const description = app.profileDescriptionInput?.value.trim() || '';
  if (description.length > 280) { notifyError('La descripción no puede superar 280 caracteres.'); return; }
  const auraStyle = ['none', 'rose', 'gold', 'violet', 'ice'].includes(app.profileAuraInput?.value)
    ? app.profileAuraInput.value
    : 'none';
  const imageFile = app.profileImageInput?.files?.[0];
  if (imageFile && (!imageFile.type.startsWith('image/') || imageFile.size > 8 * 1024 * 1024)) {
    notifyError('Elige una imagen de hasta 8 MB.');
    return;
  }
  let avatarPath;
  try {
    if (imageFile) {
      avatarPath = `${participant.id}/avatar/${crypto.randomUUID()}.${extensionFor(imageFile)}`;
      await uploadPrivateObject(avatarPath, imageFile);
    }
    const updated = await updateRows('trip_participants', `user_id=eq.${encodeURIComponent(participant.id)}`, {
      display_name: name,
      description,
      aura_style: auraStyle,
      ...(avatarPath ? { avatar_path: avatarPath } : {}),
    });
    if (!updated?.length) throw new Error('No se guardaron los cambios del perfil.');
    await loadPrivateData();
  } catch (error) {
    if (avatarPath) { try { await removePrivateObjects([avatarPath]); } catch { /* La ruta continúa siendo privada. */ } }
    notifyError(`No se pudo guardar el perfil: ${error.message}`);
    return;
  }
  app.profileEditForm.reset();
  renderParticipants();
  renderGame();
  notifySuccess('Perfil actualizado correctamente.');
}

function startActiveRewardClock() {
  const counter = document.querySelector('#rewardCountdown');
  if (!counter) return;
  let nextAt = 0;
  let claiming = false;
  const claimFromServer = async () => {
    if (claiming) return;
    claiming = true;
    try {
      const result = await callRpc('nexora_claim_coin_reward');
      nextAt = Date.parse(result.next_at);
      if (state.currentProfile) state.currentProfile.coin_balance = Number(result.balance || 0);
      window.dispatchEvent(new CustomEvent('nexora:coins-updated', { detail: Number(result.balance || 0) }));
      if (Number(result.awarded) > 0) {
        rewardMessageUntil = Date.now() + 3500;
        counter.textContent = `+${result.awarded} NexaCoins · ¡Recompensa!`;
        counter.classList.add('reward-received');
        window.setTimeout(() => counter.classList.remove('reward-received'), 3500);
      }
    } catch { counter.textContent = 'Recompensa segura · reconectando'; }
    finally { claiming = false; }
  };
  claimFromServer();
  window.setInterval(() => {
    const remaining = nextAt - Date.now();
    if (remaining <= 0) { claimFromServer(); return; }
    if (Date.now() >= rewardMessageUntil) {
      const seconds = Math.ceil(remaining / 1000);
      counter.textContent = `NexaCoins en ${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
    }
  }, 1000);
}

function updateTripCounter() {
  if (!app.tripCounter) return;
  const now = Date.now();
  const bogotaTime = formatBogotaTime(now);
  const parsedStart = new Date(state.trip.startAt || TRIP_START).getTime();
  const start = Number.isFinite(parsedStart) ? parsedStart : new Date(TRIP_START).getTime();
  const parsedEnd = state.trip.endAt ? new Date(state.trip.endAt).getTime() : NaN;
  const end = Number.isFinite(parsedEnd) && parsedEnd > start ? parsedEnd : null;
  const started = now >= start;
  const ended = started && end !== null && now >= end;
  let target; let label;
  if (ended) {
    app.counterEyebrow.textContent = 'MODO RECUERDOS';
    app.counterTitle.textContent = 'GRACIAS POR HACER PARTE DE ESTA HISTORIA.';
    target = start; label = 'DÍAS TRANSCURRIDOS';
    app.counterNote.textContent = `Viaje finalizado · Hora Colombia ${bogotaTime}`;
  } else if (started) {
    app.counterEyebrow.textContent = 'MELGAR';
    app.counterTitle.textContent = '¡ESTAMOS EN MELGAR!';
    target = start; label = 'DÍAS';
    app.counterNote.textContent = `Hora de Colombia · ${bogotaTime} · America/Bogota`;
  } else {
    app.counterEyebrow.textContent = 'CUENTA REGRESIVA';
    app.counterTitle.textContent = 'EL VIAJE COMIENZA EN...';
    target = start; label = 'DÍAS';
    app.counterNote.textContent = `Hora de Colombia · ${bogotaTime} · America/Bogota`;
  }
  const distance = ended ? Math.max(0, end - start) : Math.max(0, started ? now - start : target - now);
  const seconds = Math.floor(distance / 1000);
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  app.tripCounter.innerHTML = [
    [days, label], [hours, 'HORAS'], [minutes, 'MINUTOS'], [secs, 'SEGUNDOS'],
  ].map(([value, unit]) => `<div class="counter-unit"><strong>${String(value).padStart(2, '0')}</strong><span>${unit}</span></div>`).join('');
  app.tripCounter.dataset.phase = ended ? 'ended' : started ? 'started' : 'upcoming';
}

function formatBogotaTime(timestamp) {
  return new Intl.DateTimeFormat('es-CO', { timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).format(timestamp);
}

function formatDuration(ms) {
  const total = Math.floor(ms / 1000);
  return `${Math.floor(total / 86400)} días, ${Math.floor(total % 86400 / 3600)} horas, ${Math.floor(total % 3600 / 60)} minutos y ${total % 60} segundos`;
}

function normalizeTags(value) {
  return [...new Set((value.match(/#[\p{L}\d_]+/gu) || []).map((tag) => tag.slice(1).toLowerCase()))];
}

function extensionFor(file) {
  const byType = {
    'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif',
    'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov',
  };
  return byType[file.type] || 'bin';
}

function getProfile(id) {
  const empty = { points: 0, xp: 0, inventory: [], equipped: '', claimed: [], badges: [] };
  state.game.profiles[id] = { ...empty, ...(state.game.profiles[id] || {}) };
  return state.game.profiles[id];
}

function renderGame() {
  if (!app.playerProfile) return;
  const active = currentUser()?.id || state.game.activeParticipant;
  state.game.activeParticipant = active;
  const participant = state.participants.find((person) => person.id === active);
  if (app.tripEndAt && document.activeElement !== app.tripEndAt) app.tripEndAt.value = state.trip.endAt ? colombiaInputValue(state.trip.endAt) : '';
  const profile = getProfile(active);
  const memories = state.memories.filter((memory) => memory.participantId === active && memory.approved);
  const photos = memories.filter((memory) => memory.type === 'image');
  const xpStep = 100;
  const level = Math.min(RANKS.length, Math.floor(profile.xp / xpStep) + 1);
  const progress = Math.min(100, profile.xp % xpStep);
  if (app.profileNameInput && document.activeElement !== app.profileNameInput) app.profileNameInput.value = participant?.name || '';
  if (app.profileDescriptionInput && document.activeElement !== app.profileDescriptionInput) app.profileDescriptionInput.value = participant?.description || '';
  if (app.profileAuraInput && document.activeElement !== app.profileAuraInput) app.profileAuraInput.value = auraClass(participant?.auraStyle);
  if (app.memoryParticipant) {
    app.memoryParticipant.innerHTML = participant ? `<option value="${escapeHtml(participant.id)}">${escapeHtml(participant.name)}</option>` : '';
    app.memoryParticipant.disabled = true;
  }
  const ownedFrames = (window.nexoraFrameItems?.() || []).map((item) => item.name);
  const avatar = isLocalMediaSource(participant?.image) ? `<img src="${escapeHtml(participant.image)}" alt="" />` : escapeHtml(getInitials(participant?.name));
  const claimedMissions = state.game.missions.filter((mission) => profile.claimed.includes(mission.daily ? `${mission.id}:${localDay()}` : mission.id));
  const badges = [...new Set([...profile.badges, ...claimedMissions.map((mission) => mission.title)])];
  const currentBalance = Number(state.currentProfile?.coin_balance || 0);
  app.playerProfile.innerHTML = `<div class="profile-avatar profile-avatar--aura-${auraClass(participant?.auraStyle)}">${avatar}</div><div class="profile-main"><span class="eyebrow">NEXORA · NIVEL ${level}</span><h3>${escapeHtml(RANKS[level - 1])} · ${escapeHtml(participant?.name || 'Integrante')}</h3><p class="muted-copy">${escapeHtml(participant?.description || 'Cuéntales algo de ti a los demás invitados.')}</p><div class="xp-track"><span style="width:${progress}%"></span></div><small>${profile.xp} XP · ${xpStep - profile.xp % xpStep} XP para el siguiente nivel</small><div class="inventory-items">${ownedFrames.length ? ownedFrames.map((name) => `<span>${escapeHtml(name)}</span>`).join('') : '<span>Tu colección de marcos está vacía</span>'}</div><div class="inventory-items">${badges.length ? badges.map((badge) => `<span>✦ ${escapeHtml(badge)}</span>`).join('') : '<span>Logros por desbloquear</span>'}</div></div><div class="profile-stats"><strong>${formatNumber(currentBalance)} NX</strong><span>${photos.length} fotos aprobadas · ${ownedFrames.length} marcos</span><span>${profile.claimed.length} misiones completadas · ${badges.length} logros</span></div>`;
  if (app.personalGallery) {
    vfx.unobserveFrames(app.personalGallery);
    const personalMemories = memories.slice(0, 8);
    app.personalGallery.innerHTML = personalMemories.length
      ? personalMemories.map((memory) => `<button class="personal-gallery__item" type="button" data-memory-id="${escapeHtml(memory.id)}" aria-label="Abrir recuerdo: ${escapeHtml(memory.caption)}">${memory.type === 'video' ? '<span class="personal-gallery__video">▶</span>' : `<img src="${escapeHtml(memory.src)}" alt="" loading="lazy" decoding="async"/>`}</button>`).join('')
      : '<p class="muted-copy">Tus fotografías aprobadas aparecerán aquí.</p>';
    personalMemories.forEach((memory) => {
      if (memory.type !== 'image') return;
      const style = vfx.normalizeStyle(window.nexoraMarketFrameStyle?.(memory));
      const item = [...app.personalGallery.querySelectorAll('.personal-gallery__item')].find((node) => node.dataset.memoryId === memory.id);
      const image = item?.querySelector('img');
      if (!style || !item || !image) return;
      item.classList.add('has-vfx');
      vfx.mountFrame(item, style, { content: image });
    });
    vfx.observeFrames(app.personalGallery);
  }
  app.questList.innerHTML = state.game.missions.map((mission) => {
    const claimKey = mission.daily ? `${mission.id}:${localDay()}` : mission.id;
    const claimed = profile.claimed.includes(claimKey);
    const matching = mission.kind === 'photos'
      ? photos.length
      : memories.filter((memory) => (mission.kind === 'melgar' && memory.tags?.includes('melgar'))
        || (mission.kind === 'piscina' && memory.tags?.includes('piscina'))).length;
    const progressCount = mission.kind === 'secret' ? memories.filter((memory) => memory.tags?.includes('nexora')).length : Math.min(matching, mission.goal);
    const ready = progressCount >= mission.goal && !claimed;
    const title = mission.secret && !claimed ? '??? Misión desconocida' : mission.title;
    return `<article class="quest-card"><div><span class="eyebrow">${mission.daily ? 'DIARIA' : 'ESPECIAL'} · ${mission.reward} NP${mission.coinReward ? ` · ${mission.coinReward} NX` : ''}</span><h4>${escapeHtml(title)}</h4><p>${escapeHtml(mission.secret && !claimed ? 'Descubre cómo revelar este reto.' : mission.description)}</p><div class="quest-progress"><span style="width:${Math.round(progressCount / mission.goal * 100)}%"></span></div><small>${progressCount}/${mission.goal} · ${mission.xp} XP</small></div><button class="button ${ready ? '' : 'button-ghost'}" data-game-action="claim" data-id="${escapeHtml(mission.id)}" ${ready ? '' : 'disabled'}>${claimed ? 'Completada' : 'Reclamar'}</button></article>`;
  }).join('');
  if (app.storeGrid) app.storeGrid.innerHTML = '<p class="muted-copy">La colección sincronizada está en la Tienda.</p>';
  const ranked = [...state.participants].sort((a, b) => (getProfile(b.id).points - getProfile(a.id).points));
  app.leaderboardList.innerHTML = ranked.map((person, index) => `<div class="leader-row"><strong class="leader-rank">${String(index + 1).padStart(2, '0')}</strong><span class="participant-card__avatar">${escapeHtml(getInitials(person.name))}</span><strong>${escapeHtml(person.name)}</strong><span>${RANKS[Math.min(RANKS.length - 1, Math.floor(getProfile(person.id).xp / xpStep))]} · ${getProfile(person.id).points} NP</span></div>`).join('');
  const history = state.game.history.filter((item) => item.participantId === active).slice(0, 8);
  app.pointHistory.innerHTML = history.length ? history.map((item) => `<div class="history-row"><span>${escapeHtml(item.label)}</span><strong>${item.points > 0 ? '+' : ''}${item.points} NP</strong></div>`).join('') : '<p class="muted-copy">Tus movimientos y recompensas aparecerán aquí.</p>';
}

function colombiaInputValue(iso) {
  const parts = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(iso));
  const get = (type) => parts.find((part) => part.type === type)?.value || '00';
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
}

function localDay() { return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date()); }

async function approveMemory(memoryId) {
  if (!state.currentProfile?.is_admin) return;
  try {
    await callRpc('nexora_review_memory', { p_memory_id: memoryId, p_approved: true });
    await loadPrivateData();
    renderGallery(); renderTimeline(); renderGame();
  } catch (error) { notifyError(`No se pudo aprobar: ${error.message}`); }
}

async function claimMission(slug) {
  try {
    await callRpc('nexora_claim_mission', { p_slug: slug });
    await loadPrivateData();
    renderGame();
    await window.nexoraRefreshMarket?.();
  } catch (error) {
    const message = /MISSION_NOT_COMPLETE/.test(error.message)
      ? 'Aún no se cumple el objetivo de esta misión.'
      : /MISSION_ALREADY_CLAIMED/.test(error.message) ? 'Ya reclamaste esta misión.' : error.message;
    notifyError(message);
  }
}

function renderHero() {
  if (app.tripTitle) app.tripTitle.textContent = state.trip.title;
  if (app.tripTagline) app.tripTagline.textContent = state.trip.tagline;
  if (app.tripLocation) app.tripLocation.textContent = state.trip.location;
  if (app.tripDate) {
    const start = new Date(state.trip.startAt || TRIP_START);
    app.tripDate.textContent = new Intl.DateTimeFormat('es-CO', { timeZone: 'America/Bogota', day: 'numeric', month: 'long', year: 'numeric' }).format(start);
  }
}

function renderHomeFeature() {
  const latest = [...state.memories].filter((memory) => memory.approved !== false && memory.type === 'image')
    .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))[0];
  if (app.homeFeatureImage) {
    app.homeFeatureImage.hidden = !latest;
    if (latest) { app.homeFeatureImage.src = latest.src; app.homeFeatureImage.alt = latest.caption || 'Recuerdo compartido de Melgar'; }
  }
  if (app.homePhotoBackdrop) app.homePhotoBackdrop.hidden = Boolean(latest);
  if (app.homePhotoEmpty) app.homePhotoEmpty.hidden = Boolean(latest);
  if (app.homePhotoCaption) app.homePhotoCaption.textContent = latest ? `${latest.caption || 'Recuerdo de Melgar'} · ${latest.uploader || 'Participante'}` : '';
  if (app.homeMemoryCount) app.homeMemoryCount.textContent = String(state.memories.filter((memory) => memory.approved !== false).length);
  if (app.homeParticipantCount) app.homeParticipantCount.textContent = String(state.participants.length);
}

function renderParticipants() {
  if (!app.participantsList) return;
  if (app.galleryParticipantFilter) {
    const selected = app.galleryParticipantFilter.value || 'all';
    app.galleryParticipantFilter.innerHTML = '<option value="all">Todos</option>' + state.participants.map((person) => `<option value="${escapeHtml(person.id)}">${escapeHtml(person.name)}</option>`).join('');
    app.galleryParticipantFilter.value = state.participants.some((person) => person.id === selected) ? selected : 'all';
  }
  app.participantsList.innerHTML = state.participants
    .map(
      (participant) => {
        const image = isLocalMediaSource(participant.image)
          ? `<img src="${escapeHtml(participant.image)}" alt="${escapeHtml(participant.name)}" />`
          : `<span class="participant-card__avatar" aria-hidden="true">${escapeHtml(getInitials(participant.name))}</span>`;
        return `
        <article class="participant-card participant-card--aura-${auraClass(participant.auraStyle)}">
          <div class="participant-card__image-wrap">
            ${image}
          </div>
          <div class="participant-card__body">
            <span class="chip">${escapeHtml(participant.role)}</span>
            <h3>${escapeHtml(participant.name)}</h3>
            <p>${escapeHtml(participant.description)}</p>
            <strong>${countPhotosForUser(participant.name)} recuerdos</strong>
          </div>
        </article>
      `;
      }
    )
    .join('');
}

function renderGallery() {
  if (!app.galleryGrid) return;
  vfx.unobserveFrames(app.galleryGrid);

  const selectedParticipant = app.galleryParticipantFilter?.value || 'all';
  const selectedDate = app.galleryDateFilter?.value || '';
  const visibleMemories = state.memories.filter((memory) => (galleryFilter === 'all' || (galleryFilter === 'favorites' ? memory.favorite : memory.type === galleryFilter))
    && (selectedParticipant === 'all' || memory.participantId === selectedParticipant)
    && (!selectedDate || new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date(memory.uploadedAt)) === selectedDate));
  if (app.galleryResultCount) app.galleryResultCount.textContent = `${visibleMemories.length} ${visibleMemories.length === 1 ? 'recuerdo' : 'recuerdos'}`;
  if (!visibleMemories.length) {
    app.galleryGrid.innerHTML = `<div class="empty-state">${state.memories.length ? 'No hay publicaciones en esta categoría.' : 'Aún no hay recuerdos compartidos. Sube el primero.'}</div>`;
    renderHomeFeature();
    return;
  }

  app.galleryGrid.innerHTML = visibleMemories
    .map(
      (memory) => `
        <article class="memory-card ${memory.approved === false ? 'memory-pending' : ''}" data-memory-id="${escapeHtml(memory.id)}" data-memory-type="${escapeHtml(memory.type || 'image')}">
          <div class="memory-card__visual">
            ${memory.type === 'video'
              ? `<video src="${escapeHtml(memory.src)}" controls playsinline muted></video>`
              : `<img src="${escapeHtml(memory.src)}" alt="${escapeHtml(memory.caption)}" loading="lazy" decoding="async" />`}
          </div>
          <div class="memory-card__content">
            <div class="memory-card__meta">
              <span>${escapeHtml(memory.uploader)}</span>
              <span>${formatDate(memory.uploadedAt)}</span>
            </div>
            <p>${escapeHtml(memory.caption)}</p>
            <div class="memory-comments">${(memory.comments || []).map((comment) => `<p><strong>${escapeHtml(comment.author)}</strong> ${escapeHtml(comment.text)}</p>`).join('')}</div>
            ${memory.approved ? `<div class="memory-social-actions"><button type="button" data-memory-reaction="${escapeHtml(memory.id)}" aria-label="Reaccionar con corazón">${memory.reactions?.length ? '♥' : '♡'} ${memory.reactions?.length || 0}</button><button type="button" data-memory-favorite="${escapeHtml(memory.id)}" aria-label="${memory.favorite ? 'Quitar de favoritas' : 'Guardar en favoritas'}">${memory.favorite ? '★ Guardada' : '☆ Favorita'}</button></div><form class="memory-comment-form" data-memory-comment data-memory-id="${escapeHtml(memory.id)}"><input class="form-input" aria-label="Comentar publicación" maxlength="240" placeholder="Escribe un comentario"/><button class="button-ghost" type="submit">Enviar</button></form>` : `<div class="pending-review"><span>Pendiente de revisión</span>${state.currentProfile?.is_admin ? `<button type="button" class="button-ghost" data-game-action="approve" data-id="${escapeHtml(memory.id)}">Aprobar</button>` : ''}</div>`}
            ${memory.approved && memory.userId === currentUser()?.id ? `<label class="memory-frame-control">Cambiar marco<select class="form-input" data-memory-frame="${escapeHtml(memory.id)}"><option value="">Sin marco</option>${(window.nexoraFrameItems?.() || []).map((frame) => `<option value="${escapeHtml(frame.id)}" ${memory.frameItemId === frame.id ? 'selected' : ''}>${escapeHtml(frame.name)}</option>`).join('')}</select></label>` : ''}
          </div>
        </article>
      `
    )
    .join('');
  const cardsById = new Map([...app.galleryGrid.querySelectorAll('.memory-card')].map((card) => [card.dataset.memoryId, card]));
  visibleMemories.forEach((memory) => {
    if (memory.type === 'video') return;
    const style = vfx.normalizeStyle(window.nexoraMarketFrameStyle?.(memory));
    const card = cardsById.get(memory.id);
    const visual = card?.querySelector('.memory-card__visual');
    const image = visual?.querySelector('img');
    if (!style || !card || !visual || !image) return;
    card.classList.add('has-vfx', `memory-card--${style}`);
    vfx.mountFrame(visual, style, { content: image });
  });
  vfx.observeFrames(app.galleryGrid);
  observeMemoryCards();
  renderHomeFeature();
}

async function changeMemoryFrame(memoryId, frameId) {
  try {
    await callRpc('nexora_set_memory_frame', { p_memory_id: memoryId, p_item_id: frameId });
    const memory = state.memories.find((item) => item.id === memoryId);
    if (memory) memory.frameItemId = frameId;
    renderGallery();
  } catch (error) {
    notifyError(/FRAME_NOT_OWNED/.test(error.message) ? 'Solo puedes usar marcos que ya compraste.' : `No se pudo cambiar el marco: ${error.message}`);
    renderGallery();
  }
}

async function toggleMemoryFavorite(button) {
  const memory = state.memories.find((item) => item.id === button.dataset.memoryFavorite);
  const userId = currentUser()?.id;
  if (!memory || !userId) return;
  try {
    if (memory.favorite) await deleteRows('memory_favorites', `memory_id=eq.${encodeURIComponent(memory.id)}&user_id=eq.${encodeURIComponent(userId)}`);
    else await insertRow('memory_favorites', { memory_id: memory.id, user_id: userId });
    memory.favorite = !memory.favorite;
    renderGallery();
  } catch (error) { notifyError(`No se pudo actualizar Favoritas: ${error.message}`); }
}

async function toggleMemoryReaction(button) {
  const memory = state.memories.find((item) => item.id === button.dataset.memoryReaction);
  const userId = currentUser()?.id;
  if (!memory || !userId) return;
  const prior = (memory.reactions || []).find((reaction) => reaction.user_id === userId && reaction.reaction === 'heart');
  try {
    if (prior) {
      await deleteRows('memory_reactions', `memory_id=eq.${encodeURIComponent(memory.id)}&user_id=eq.${encodeURIComponent(userId)}&reaction=eq.heart`);
      memory.reactions = memory.reactions.filter((reaction) => reaction !== prior);
    } else {
      await insertRow('memory_reactions', { memory_id: memory.id, user_id: userId, reaction: 'heart' });
      memory.reactions = [...(memory.reactions || []), { user_id: userId, reaction: 'heart' }];
    }
    renderGallery();
  } catch (error) { notifyError(`No se pudo guardar la reacción: ${error.message}`); }
}

function renderActivities() {
  if (!app.activityList) return;
  app.activityList.innerHTML = state.activities
    .map(
      (activity) => `
        <article class="activity-card">
          <span class="activity-date">${escapeHtml(activity.date)}</span>
          <h3>${escapeHtml(activity.title)}</h3>
          <p>${escapeHtml(activity.description)}</p>
        </article>
      `
    )
    .join('') || '<div class="empty-state">Las actividades todavía no se han configurado.</div>';
}

function renderTimeline() {
  if (!app.timelineList) return;

  const sorted = [...state.memories].sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
  app.timelineList.innerHTML = sorted
    .map(
      (memory) => `
        <div class="timeline-item">
          <span class="timeline-date">${formatDate(memory.uploadedAt)}</span>
          <div>
            <strong>${escapeHtml(memory.uploader)}</strong>
            <p>${escapeHtml(memory.caption)}</p>
          </div>
        </div>
      `
    )
    .join('') || '<div class="empty-state">La línea de tiempo aparecerá cuando se publiquen recuerdos.</div>';
}

function renderMessages() {
  if (!app.messagesList) return;
  app.messagesList.innerHTML = state.messages
    .map(
      (message) => `
        <article class="comment-card">
          <strong>${escapeHtml(message.author)}</strong>
          <p>${escapeHtml(message.text)}</p>
        </article>
      `
    )
    .join('') || '<div class="empty-state">Todavía no hay mensajes.</div>';
}

function renderDonations() {
  if (!app.donationGoal || !app.donationRaised || !app.donationProgress || !app.donationCount) return;
  const goal = Number(state.donations.goal || 0);
  const raised = Number(state.donations.raised || 0);
  const progress = goal > 0 ? Math.min((raised / goal) * 100, 100) : 0;

  app.donationGoal.textContent = formatCurrency(goal);
  app.donationRaised.textContent = formatCurrency(raised);
  app.donationProgress.style.width = `${progress}%`;
  app.donationCount.textContent = `${state.donations.count} donaciones`;

  const methodsWrap = document.querySelector('#paymentMethods');
  if (methodsWrap) {
    methodsWrap.innerHTML = state.donations.methods.length ? state.donations.methods.map((method) => `<li>${escapeHtml(method)}</li>`).join('') : '<li>Sin métodos configurados todavía.</li>';
  }
}

function openViewer(memory) {
  if (!app.viewerModal || !app.viewerContent) return;
  vfx.unobserveFrames(app.viewerContent);
  app.viewerModal.classList.remove('hidden');
  app.viewerContent.innerHTML = `
    <div class="viewer-vfx-mount"></div>
    <div class="viewer-meta">
      <div>
        <strong>${escapeHtml(memory.uploader)}</strong>
        <span>${formatDate(memory.uploadedAt)}</span>
      </div>
      <a class="download-button" href="${escapeHtml(memory.src)}" target="_blank" rel="noreferrer">Descargar</a>
    </div>
    <p>${escapeHtml(memory.caption)}</p>
  `;
  const media = document.createElement(memory.type === 'video' ? 'video' : 'img');
  media.className = 'viewer-media';
  media.src = memory.src;
  if (memory.type === 'video') {
    media.controls = true;
    media.playsInline = true;
  } else {
    media.alt = memory.caption || '';
  }
  const style = memory.type === 'image' ? vfx.normalizeStyle(window.nexoraMarketFrameStyle?.(memory)) : '';
  const framedMedia = style ? vfx.createFrame(style, { content: media }) : media;
  app.viewerContent.querySelector('.viewer-vfx-mount').replaceChildren(framedMedia);
  if (style) vfx.observeFrames(framedMedia);
}

function closeViewer() {
  if (!app.viewerModal) return;
  app.viewerModal.classList.add('hidden');
}

function persistState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(defaultState);
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return structuredClone(defaultState);

    const savedGame = parsed.game && typeof parsed.game === 'object' && !Array.isArray(parsed.game) ? parsed.game : {};
    const savedProfiles = savedGame.profiles && typeof savedGame.profiles === 'object' && !Array.isArray(savedGame.profiles) ? savedGame.profiles : {};
    const profiles = Object.fromEntries(Object.entries(savedProfiles).map(([id, profile]) => {
      const value = profile && typeof profile === 'object' && !Array.isArray(profile) ? profile : {};
      return [id, {
        points: Number.isFinite(Number(value.points)) ? Math.max(0, Number(value.points)) : 0,
        xp: Number.isFinite(Number(value.xp)) ? Math.max(0, Number(value.xp)) : 0,
        inventory: Array.isArray(value.inventory) ? value.inventory.filter((itemId) => STORE_ITEMS.some((item) => item.id === itemId)) : [],
        equipped: typeof value.equipped === 'string' ? value.equipped : '',
        claimed: Array.isArray(value.claimed) ? value.claimed.filter((itemId) => typeof itemId === 'string') : [],
        badges: Array.isArray(value.badges) ? value.badges.filter((badge) => typeof badge === 'string') : [],
      }];
    }));
    const savedMissions = Array.isArray(savedGame.missions) ? savedGame.missions : [];
    const missionsAreValid = savedMissions.length && savedMissions.every((mission) => mission && typeof mission === 'object'
      && typeof mission.id === 'string' && typeof mission.title === 'string'
      && Number.isFinite(Number(mission.reward)) && Number(mission.reward) >= 0
      && Number.isFinite(Number(mission.xp)) && Number(mission.xp) >= 0
      && Number.isFinite(Number(mission.goal)) && Number(mission.goal) > 0);
    const savedDonations = parsed.donations && typeof parsed.donations === 'object' && !Array.isArray(parsed.donations) ? parsed.donations : {};
    const donations = savedDonations.goal === 2500000 && savedDonations.raised === 1825000 && savedDonations.count === 18
      ? structuredClone(defaultState.donations)
      : { ...structuredClone(defaultState.donations), ...savedDonations };
    donations.goal = Number.isFinite(Number(donations.goal)) ? Math.max(0, Number(donations.goal)) : 0;
    donations.raised = Number.isFinite(Number(donations.raised)) ? Math.max(0, Number(donations.raised)) : 0;
    donations.count = Number.isFinite(Number(donations.count)) ? Math.max(0, Math.floor(Number(donations.count))) : 0;
    donations.methods = Array.isArray(donations.methods) ? donations.methods.filter((method) => typeof method === 'string') : [];
    donations.note = typeof donations.note === 'string' ? donations.note : '';
    const trip = { ...structuredClone(defaultState.trip), ...(parsed.trip || {}), dateLabel: defaultState.trip.dateLabel, startAt: TRIP_START, tagline: defaultState.trip.tagline };
    if (!Number.isFinite(Date.parse(trip.startAt))) trip.startAt = TRIP_START;
    if (trip.endAt && !Number.isFinite(Date.parse(trip.endAt))) trip.endAt = '';
    const participants = (Array.isArray(parsed.participants) && parsed.participants.length ? parsed.participants : structuredClone(defaultState.participants))
      .filter((participant) => participant && typeof participant === 'object')
      .map((participant) => ({ ...participant, image: isLocalMediaSource(participant.image) ? participant.image : '' }));
    if (!participants.length) participants.push(...structuredClone(defaultState.participants));

    return {
      ...structuredClone(defaultState),
      ...parsed,
      trip,
      game: {
        ...structuredClone(defaultState.game),
        ...savedGame,
        profiles,
        history: Array.isArray(savedGame.history) ? savedGame.history.filter((item) => item && typeof item === 'object' && Number.isFinite(Number(item.points))) : [],
        missions: missionsAreValid ? savedMissions : structuredClone(defaultState.game.missions),
      },
      participants,
      memories: (Array.isArray(parsed.memories) ? parsed.memories : structuredClone(defaultState.memories))
        .filter((memory) => memory && typeof memory === 'object' && isLocalMediaSource(memory.src))
        .map((memory) => ({
          ...memory,
          id: String(memory.id || `memory-${Date.now()}`),
          type: memory.type === 'video' ? 'video' : 'image',
          caption: typeof memory.caption === 'string' ? memory.caption : 'Recuerdo del viaje',
          uploader: typeof memory.uploader === 'string' ? memory.uploader : 'Participante',
          tags: Array.isArray(memory.tags) ? memory.tags.filter((tag) => typeof tag === 'string') : [],
          comments: Array.isArray(memory.comments) ? memory.comments.filter((comment) => comment && typeof comment.text === 'string') : [],
          uploadedAt: Number.isFinite(Date.parse(memory.uploadedAt)) ? memory.uploadedAt : new Date().toISOString(),
          size: ['large', 'medium', 'small'].includes(memory.size) ? memory.size : 'medium',
        })),
      activities: (Array.isArray(parsed.activities) ? parsed.activities : []).filter((activity) => activity && typeof activity === 'object' && !['a1', 'a2', 'a3'].includes(activity.id)),
      messages: (Array.isArray(parsed.messages) ? parsed.messages : []).filter((message) => message && typeof message === 'object' && !['mssg1', 'mssg2'].includes(message.id)),
      donations,
    };
  } catch (error) {
    return structuredClone(defaultState);
  }
}

function isLocalMediaSource(source) {
  if (typeof source !== 'string') return false;
  if (/^data:(image|video)\//i.test(source) || (source.startsWith('/') && !source.startsWith('//'))) return true;
  try { return new URL(source).protocol === 'https:'; } catch { return false; }
}

function auraClass(value) {
  return ['rose', 'gold', 'violet', 'ice'].includes(value) ? value : 'none';
}

function getInitials(name) {
  return String(name || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

function formatDate(value) {
  return new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' }).format(new Date(value));
}

function formatNumber(value) {
  return new Intl.NumberFormat('es-CO').format(Number(value) || 0);
}

function formatCurrency(value) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function countPhotosForUser(name) {
  return state.memories.filter((memory) => memory.uploader === name).length;
}

function frameClass(participantId) {
  const frame = getProfile(participantId || state.game.activeParticipant).equipped;
  const item = STORE_ITEMS.find((entry) => entry.id === frame);
  return item ? `frame-applied frame-${item.style}` : '';
}

async function readFileAsDataUrl(file) {
  if (file.type.startsWith('image/') && typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, 1440 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close?.();
      const compressed = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', 0.78));
      if (compressed && compressed.size < file.size) file = compressed;
    } catch { /* Si el navegador no puede comprimir, conserva la imagen original. */ }
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function getVideoDuration(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => { const duration = video.duration; URL.revokeObjectURL(url); resolve(Number.isFinite(duration) ? duration : Infinity); };
    video.onerror = () => { URL.revokeObjectURL(url); resolve(Infinity); };
    video.src = url;
  });
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
