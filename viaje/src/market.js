import { callRpc, currentUser, selectRows } from './supabase.js';

const baseUrl = import.meta.env?.BASE_URL || './';

const sellerLines = {
  entrance: ['Vaya, vaya... tenemos un nuevo visitante.', 'Piezas únicas para historias que merecen quedarse.', 'Pasa. Siempre hay algo especial esperando.'],
  purchase: ['Una excelente elección. Ya es tuya.', 'Una pieza digna de tu colección.', 'Ese marco va a lucir increíble en tus recuerdos.'],
  broke: ['Aún te faltan monedas para esa pieza.', 'Vuelve cuando tengas más NR Coins.'],
  special: ['Has elegido una pieza mítica. Cuídala bien.', 'Esto no se encuentra todos los días.'],
};

const ui = {
  wallet: document.querySelector('#coinBalance'),
  member: document.querySelector('#marketAccountName'),
  status: document.querySelector('#marketStatus'),
  connection: document.querySelector('#marketConnection'),
  catalog: document.querySelector('#marketCatalog'),
  inventory: document.querySelector('#marketInventory'),
  history: document.querySelector('#marketHistory'),
  equipped: document.querySelector('#equippedLabel'),
  reveal: document.querySelector('#marketReveal'),
  merchantCard: document.querySelector('#merchantCard'),
  merchantImage: document.querySelector('#merchantImage'),
  merchantShowcase: document.querySelector('#merchantShowcase'),
  dialogue: document.querySelector('#merchantDialogue'),
  categories: document.querySelector('#marketCategories'),
};

let catalog = [];
let inventory = [];
let transactions = [];
let equippedItemId = null;
let balance = 0;
let selectedCategory = 'all';
let revealTimer;
let busy = false;

export async function initMarket() {
  if (!ui.catalog) return;
  ui.connection.textContent = 'CONECTANDO CON EL MERCADO SEGURO';
  ui.status.textContent = 'Compras e inventario protegidos por Supabase.';
  ui.member.textContent = window.nexoraMemberName || 'Integrante';
  ui.catalog.addEventListener('click', handleCatalogAction);
  ui.inventory.addEventListener('click', handleInventoryAction);
  ui.categories?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-market-category]');
    if (!button) return;
    selectedCategory = button.dataset.marketCategory;
    ui.categories.querySelectorAll('[data-market-category]').forEach((item) => item.classList.toggle('is-active', item === button));
    renderCatalog();
  });
  ui.reveal?.addEventListener('click', (event) => { if (event.target.closest('[data-market-reveal-close]')) closeReveal(); });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeReveal(); });
  window.addEventListener('nexora:coins-updated', (event) => { balance = Number(event.detail || 0); renderWallet(); });

  window.nexoraMarketUserId = () => currentUser()?.id || null;
  window.nexoraMarketFrameClass = (memory) => {
    const item = inventory.find((owned) => owned.id === memory?.frameItemId);
    return item ? `memory-card--${item.preview_style}` : '';
  };
  window.nexoraFrameItems = () => inventory.filter((item) => item.category === 'frame');
  window.nexoraEquippedFrameId = () => equippedItemId;
  window.nexoraRefreshMarket = loadMarket;
  window.addEventListener('nexora:inventory-updated', () => loadMarket());
  window.addEventListener('nexora:auth-changed', () => { closeReveal(); });
  await loadMarket();
  loadMerchantImage();
  setMerchantMood('idle');
  say('entrance');
}

async function loadMarket() {
  const user = currentUser();
  if (!user) return;
  ui.connection.textContent = 'CARGANDO CATÁLOGO';
  try {
    const uid = encodeURIComponent(user.id);
    const [items, profile, owned, equipped, history] = await Promise.all([
      selectRows('store_items', 'select=id,slug,name,description,price,rarity,preview_style,category&active=eq.true&order=price.asc'),
      selectRows('profiles', `select=coin_balance&user_id=eq.${uid}`),
      selectRows('user_inventory', `select=item_id,purchased_at,store_items(id,slug,name,description,price,rarity,preview_style,category)&user_id=eq.${uid}&order=purchased_at.desc`),
      selectRows('equipped_items', `select=item_id&user_id=eq.${uid}`),
      selectRows('coin_transactions', `select=id,delta,reason,created_at&user_id=eq.${uid}&order=created_at.desc&limit=30`),
    ]);
    catalog = items;
    inventory = owned.map((entry) => entry.store_items).filter(Boolean);
    balance = Number(profile[0]?.coin_balance || 0);
    equippedItemId = equipped[0]?.item_id || null;
    transactions = history;
    ui.connection.textContent = 'NR COINS · SINCRONIZADAS';
    ui.status.textContent = 'Tus compras y marcos desbloqueados se guardan en tu cuenta.';
    renderMarket();
    window.dispatchEvent(new CustomEvent('nexora:inventory-ready', { detail: inventory }));
  } catch (error) {
    ui.connection.textContent = 'NO SE PUDO CARGAR';
    ui.status.textContent = `Revisa la migración de la tienda en Supabase. ${error.message}`;
  }
}

function renderMarket() {
  renderWallet();
  renderCatalog();
  renderInventory();
  renderHistory();
}

function renderWallet() {
  if (ui.wallet) ui.wallet.textContent = `${formatNumber(balance)} NR`;
}

function renderCatalog() {
  if (!ui.catalog) return;
  const items = catalog.filter((item) => selectedCategory === 'all' || item.category === selectedCategory);
  ui.catalog.innerHTML = items.length ? items.map((item) => {
    const owned = inventory.some((entry) => entry.id === item.id);
    return `<article class="market-item market-rarity--${escapeHtml(item.rarity)}" data-item-card="${escapeHtml(item.id)}">
      <div class="market-item__art"><span class="market-rarity">${escapeHtml(item.rarity)}</span><div class="market-frame-preview market-frame-preview--${escapeHtml(item.preview_style)}"><span>NEXORA</span><strong>RECUERDO</strong><small>MELGAR · 2026</small></div></div>
      <div class="market-item__body"><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.description)}</p><div class="market-item__buy"><strong class="market-price">${formatNumber(item.price)} <small>NR COINS</small></strong><button class="button" type="button" data-market-buy="${escapeHtml(item.id)}" ${owned || busy ? 'disabled' : ''}>${owned ? 'Desbloqueado' : 'Ver y comprar'}</button></div></div>
    </article>`;
  }).join('') : '<p class="market-empty">Todavía no hay artículos en esta categoría.</p>';
}

function renderInventory() {
  if (!ui.inventory) return;
  ui.inventory.innerHTML = inventory.length
    ? inventory.map((item) => `<article class="inventory-item"><div class="market-frame-preview market-frame-preview--${escapeHtml(item.preview_style)}"><span>NEXORA</span><strong>RECUERDO</strong><small>MELGAR · 2026</small></div><div><strong>${escapeHtml(item.name)}</strong><small>${equippedItemId === item.id ? 'Equipado' : 'En tu colección'}</small><button class="button-ghost" type="button" data-market-equip="${escapeHtml(item.id)}">${equippedItemId === item.id ? 'Quitar marco' : 'Equipar marco'}</button></div></article>`).join('')
    : '<p class="market-empty">Tus marcos comprados aparecerán aquí.</p>';
  const equipped = inventory.find((item) => item.id === equippedItemId);
  if (ui.equipped) ui.equipped.textContent = equipped ? `Equipado · ${equipped.name}` : 'Sin marco equipado';
}

function renderHistory() {
  if (!ui.history) return;
  ui.history.innerHTML = transactions.length
    ? transactions.map((entry) => `<div class="market-transaction"><span>${escapeHtml(entry.reason)}<small>${formatDate(entry.created_at)}</small></span><strong class="${entry.delta < 0 ? 'is-debit' : 'is-credit'}">${entry.delta > 0 ? '+' : ''}${formatNumber(entry.delta)} NR</strong></div>`).join('')
    : '<p class="market-empty">Todavía no hay movimientos.</p>';
}

async function handleCatalogAction(event) {
  const button = event.target.closest('[data-market-buy]');
  if (!button || button.disabled || busy) return;
  const item = catalog.find((entry) => entry.id === button.dataset.marketBuy);
  if (!item) return;
  if (!window.confirm(`¿Comprar ${item.name} por ${formatNumber(item.price)} NR Coins?`)) return;
  busy = true; renderCatalog();
  try {
    const result = await callRpc('nexora_buy_item', { p_item_id: item.id });
    balance = Number(result.balance ?? balance);
    setMerchantMood(item.rarity === 'legendary' ? 'special' : 'buy');
    say(item.rarity === 'legendary' ? 'special' : 'purchase');
    await loadMarket();
    revealPurchase(item, result.balance);
  } catch (error) {
    if (/INSUFFICIENT_COINS/.test(error.message)) { setMerchantMood('idle'); say('broke'); }
    ui.status.textContent = `No se completó la compra: ${error.message}`;
  } finally { busy = false; renderCatalog(); }
}

async function handleInventoryAction(event) {
  const button = event.target.closest('[data-market-equip]');
  if (!button || busy) return;
  const id = button.dataset.marketEquip;
  const nextItem = equippedItemId === id ? null : id;
  busy = true;
  try {
    await callRpc('nexora_equip_item', { p_item_id: nextItem });
    equippedItemId = nextItem;
    await loadMarket();
    window.dispatchEvent(new Event('nexora:inventory-updated'));
  } catch (error) { ui.status.textContent = `No se pudo equipar el marco: ${error.message}`; }
  finally { busy = false; }
}

function revealPurchase(item, newBalance) {
  const name = document.querySelector('#revealItemName');
  const cost = document.querySelector('#revealCost');
  const preview = document.querySelector('#revealFrame');
  if (name) name.textContent = item.name;
  if (cost) cost.textContent = `−${formatNumber(item.price)} NR Coins · Saldo: ${formatNumber(newBalance)} NR`;
  if (preview) preview.className = `market-frame-preview market-frame-preview--${item.preview_style}`;
  ui.reveal?.classList.remove('hidden');
  window.clearTimeout(revealTimer);
  revealTimer = window.setTimeout(closeReveal, 9000);
}

function closeReveal() { ui.reveal?.classList.add('hidden'); window.clearTimeout(revealTimer); }
function setMerchantMood(mood) { ui.merchantCard?.setAttribute('data-mood', mood); }
function say(kind) { const lines = sellerLines[kind] || sellerLines.purchase; if (ui.dialogue) { ui.dialogue.textContent = `«${lines[Math.floor(Math.random() * lines.length)]}»`; ui.dialogue.classList.remove('dialogue-pulse'); void ui.dialogue.offsetWidth; ui.dialogue.classList.add('dialogue-pulse'); } }

function loadMerchantImage() {
  if (!ui.merchantImage || !ui.merchantShowcase) return;
  ui.merchantImage.src = `${baseUrl}images/merchant/vendedor.png`;
  const reveal = () => {
    const loaded = ui.merchantImage.naturalWidth > 0;
    ui.merchantImage.classList.toggle('is-visible', loaded);
    ui.merchantShowcase.classList.toggle('hidden', loaded);
  };
  if (ui.merchantImage.complete) reveal();
  else { ui.merchantImage.addEventListener('load', reveal, { once: true }); ui.merchantImage.addEventListener('error', reveal, { once: true }); }
}

function formatNumber(value) { return new Intl.NumberFormat('es-CO').format(Number(value) || 0); }
function formatDate(value) { return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)); }
function escapeHtml(value = '') { return String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;'); }
