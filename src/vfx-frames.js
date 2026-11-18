const styles = new Set(['blood', 'ocean', 'lightning', 'angel', 'venom', 'mythic']);
const observedFrames = new WeakSet();
const baseUrl = import.meta.env?.BASE_URL || './public/';
let observer;

function normalizeStyle(value) {
  const style = String(value || '').toLowerCase();
  return styles.has(style) ? style : '';
}

function createFrame(styleValue, { src = '', alt = '', content = null, placeholder = '', loading = 'lazy' } = {}) {
  const style = normalizeStyle(styleValue);
  if (!style) throw new Error(`Unknown VFX frame style: ${styleValue}`);

  const frame = document.createElement('figure');
  frame.className = `vfx-frame vfx-frame--${style}`;
  frame.dataset.vfxFrame = style;

  const aura = document.createElement('span');
  aura.className = 'vfx-aura';
  aura.setAttribute('aria-hidden', 'true');

  const effects = document.createElement('span');
  effects.className = 'vfx-effects';
  effects.setAttribute('aria-hidden', 'true');

  const particles = document.createElement('span');
  particles.className = 'vfx-particles';
  particles.setAttribute('aria-hidden', 'true');
  for (let index = 0; index < 6; index += 1) particles.append(document.createElement('i'));

  const ornaments = document.createElement('span');
  ornaments.className = 'vfx-ornaments';
  ornaments.setAttribute('aria-hidden', 'true');

  const artwork = document.createElement('img');
  artwork.className = 'vfx-frame-artwork';
  artwork.src = `${baseUrl}images/frames/${style}.png`;
  artwork.alt = '';
  artwork.setAttribute('aria-hidden', 'true');
  artwork.decoding = 'async';

  const photo = document.createElement('div');
  photo.className = 'vfx-photo';
  if (content) {
    photo.append(content);
  } else if (src) {
    const image = document.createElement('img');
    image.src = src;
    image.alt = alt;
    image.loading = loading;
    image.decoding = 'async';
    photo.append(image);
  } else {
    const sample = document.createElement('span');
    sample.className = 'vfx-placeholder';
    sample.innerHTML = '<small>VFX · NEXORA</small><strong></strong><span>MELGAR · 2026</span>';
    sample.querySelector('strong').textContent = placeholder || 'Elige una foto';
    photo.append(sample);
  }

  frame.append(aura, effects, particles, ornaments, photo, artwork);
  return frame;
}

function getFrames(root) {
  const frames = [];
  if (root instanceof Element && root.matches('.vfx-frame')) frames.push(root);
  frames.push(...root.querySelectorAll('.vfx-frame'));
  return frames;
}

function observeFrames(root = document) {
  const frames = getFrames(root);
  if (!('IntersectionObserver' in window)) {
    frames.forEach((frame) => frame.classList.add('is-visible'));
    return;
  }
  if (!observer) {
    observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => entry.target.classList.toggle('is-visible', entry.isIntersecting));
    }, { rootMargin: '0px', threshold: 0.01 });
  }
  frames.forEach((frame) => {
    if (observedFrames.has(frame)) return;
    observedFrames.add(frame);
    observer.observe(frame);
  });
}

function unobserveFrames(root) {
  if (!observer) return;
  getFrames(root).forEach((frame) => observer.unobserve(frame));
}

function mountFrame(target, style, options = {}) {
  unobserveFrames(target);
  const frame = createFrame(style, options);
  target.replaceChildren(frame);
  observeFrames(frame);
  return frame;
}

function restoreContent(target, content) {
  unobserveFrames(target);
  target.replaceChildren(...(Array.isArray(content) ? content : [content]).filter(Boolean));
}

window.NexoraVfx = Object.freeze({
  createFrame,
  mountFrame,
  normalizeStyle,
  observeFrames,
  restoreContent,
  unobserveFrames,
});
