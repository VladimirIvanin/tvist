const demo = document.querySelector('.stories-demo');
const shell = demo.querySelector('.stories-shell');
const groupButtons = [...demo.querySelectorAll('[data-story-group]')];
const innerRoots = [...demo.querySelectorAll('.stories-inner')];
const progressFills = innerRoots.map(root => [...root.querySelectorAll('.stories-progress__fill')]);
const motionButton = demo.querySelector('.demo-motion-toggle');
const previousButton = demo.querySelector('[data-story-prev]');
const nextButton = demo.querySelector('[data-story-next]');
const status = demo.querySelector('.stories-status');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const HOLD_THRESHOLD = 100;
const STORY_AUTOPLAY = { delay: 2800, pauseOnHover: false, pauseOnFocus: false, waitForVideo: false };
let activeGroup = 0;
let transitioning = false;
let ended = false;
let paused = reducedMotion.matches;
let holding = false;
let visible = true;
let tap = null;

// Внешний слайдер переключает авторов, внутренние — истории каждого автора.
const groupSlider = new TvistV1(demo.querySelector('.stories-groups'), {
  perPage: 1,
  gap: 0,
  loop: false,
  drag: true,
  autoplay: false,
  effect: 'slide',
  speed: 0,
  breakpoints: {
    767: {
      effect: 'cube',
      speed: reducedMotion.matches ? 0 : 540,
      cubeEffect: { slideShadows: false, viewportPadding: 0 },
    },
  },
});

function renderProgress(groupIndex, storyIndex, progress) {
  progressFills[groupIndex].forEach((fill, index) => {
    const value = index < storyIndex ? 1 : index > storyIndex ? 0 : Math.max(0, Math.min(1, progress));
    fill.style.transform = `scaleX(${value})`;
  });
}

function renderControls() {
  const slider = innerSliders[activeGroup];
  groupButtons.forEach((button, index) => button.setAttribute('aria-pressed', String(index === activeGroup)));
  previousButton.disabled = transitioning || ended || (activeGroup === 0 && slider.realIndex === 0);
  nextButton.disabled = transitioning || ended;
  motionButton.disabled = transitioning || ended;
  motionButton.textContent = paused ? 'Воспроизвести' : 'Пауза';
  motionButton.setAttribute('aria-pressed', String(paused));
  shell.classList.toggle('stories-shell--hold-paused', holding);
  if (ended) status.textContent = 'Все истории просмотрены. Можно начать сначала.';
  else if (holding) status.textContent = 'Пауза по удержанию';
  else status.textContent = `${groupButtons[activeGroup].firstElementChild.textContent} · история ${slider.realIndex + 1} из ${slider.slides.length}`;
}

function activateGroup(index) {
  activeGroup = index;
  transitioning = false;
  ended = false;
  holding = false;
  // Запускаем только видимую группу; скрытые истории не расходуют свой таймер.
  innerSliders.forEach((slider, groupIndex) => {
    const active = groupIndex === index;
    if (active) {
      slider.update();
      renderProgress(index, slider.realIndex, 0);
    }
    slider.updateOptions({ autoplay: active ? STORY_AUTOPLAY : false });
    if (active && (paused || !visible)) slider.autoplay.pause();
  });
  renderControls();
}

function goToGroup(index) {
  if (transitioning || index < 0 || index >= innerSliders.length || index === activeGroup) return;
  groupSlider.scrollTo(index);
}

function finishGroup(groupIndex) {
  if (groupIndex !== activeGroup || transitioning || ended) return;
  renderProgress(groupIndex, innerSliders[groupIndex].slides.length - 1, 1);
  innerSliders[groupIndex].updateOptions({ autoplay: false });
  if (groupIndex < innerSliders.length - 1) {
    goToGroup(groupIndex + 1);
  } else {
    ended = true;
    renderControls();
  }
}

const innerSliders = innerRoots.map((root, groupIndex) => new TvistV1(root, {
  perPage: 1,
  gap: 0,
  speed: 0,
  loop: false,
  drag: true,
  // Видимость всего примера отслеживает внешний слайдер. Группами управляем здесь.
  visibility: false,
  autoplay: false,
  holdToPause: { threshold: HOLD_THRESHOLD, cancelOnDrag: true },
  on: {
    autoplayProgress: ({ progress, index }) => {
      if (groupIndex === activeGroup && !transitioning && index === innerSliders[groupIndex].realIndex) {
        renderProgress(groupIndex, index, progress);
      }
    },
    slideChangeStart: index => renderProgress(groupIndex, index, 0),
    slideChangeEnd: () => {
      if (groupIndex === activeGroup) renderControls();
    },
    reachEnd: () => finishGroup(groupIndex),
    longPressStart: () => {
      if (groupIndex !== activeGroup) return;
      holding = true;
      renderControls();
    },
    longPressEnd: () => {
      if (groupIndex !== activeGroup) return;
      holding = false;
      if (paused) innerSliders[groupIndex].autoplay?.pause();
      renderControls();
    },
  },
}));

groupSlider.on('slideChangeStart', () => {
  transitioning = true;
  tap = null;
  holding = false;
  innerSliders.forEach(slider => slider.updateOptions({ autoplay: false }));
  renderControls();
});
groupSlider.on('slideChangeEnd', index => activateGroup(index));
groupSlider.on('sliderHidden', () => {
  visible = false;
  innerSliders[activeGroup].autoplay?.pause();
});
groupSlider.on('sliderVisible', () => {
  visible = true;
  if (!paused && !holding && !transitioning && !ended) innerSliders[activeGroup].autoplay?.resume();
});

function navigateStory(direction) {
  if (transitioning || ended) return;
  const slider = innerSliders[activeGroup];
  if (direction === 'prev') {
    if (slider.realIndex > 0) slider.prev();
    else goToGroup(activeGroup - 1);
  } else if (slider.realIndex < slider.slides.length - 1) {
    slider.next();
  } else {
    finishGroup(activeGroup);
  }
  if (paused) innerSliders[activeGroup].autoplay?.pause();
}

groupButtons.forEach((button, index) => button.addEventListener('click', () => goToGroup(index)));
previousButton.addEventListener('click', () => navigateStory('prev'));
nextButton.addEventListener('click', () => navigateStory('next'));
motionButton.addEventListener('click', () => {
  paused = !paused;
  const autoplay = innerSliders[activeGroup].autoplay;
  if (paused) autoplay.pause();
  else autoplay.resume();
  renderControls();
});

demo.querySelector('[data-stories-replay]').addEventListener('click', () => {
  ended = false;
  paused = reducedMotion.matches;
  innerSliders.forEach((slider, index) => {
    slider.updateOptions({ autoplay: false });
    slider.scrollTo(0, true);
    renderProgress(index, 0, 0);
  });
  if (groupSlider.realIndex === 0) activateGroup(0);
  else groupSlider.scrollTo(0, true);
});

// Тапы считываем на самом слайдере: оверлеи не перекрывают holdToPause и drag.
innerRoots.forEach((root, groupIndex) => root.addEventListener('pointerdown', event => {
  if (!event.isPrimary || event.button !== 0 || transitioning || ended || groupIndex !== activeGroup) return;
  const bounds = root.getBoundingClientRect();
  const position = (event.clientX - bounds.left) / bounds.width;
  tap = {
    pointerId: event.pointerId,
    x: event.clientX,
    y: event.clientY,
    startedAt: performance.now(),
    groupIndex,
    storyIndex: innerSliders[groupIndex].realIndex,
    direction: position < .35 ? 'prev' : position > .65 ? 'next' : null,
  };
}, { capture: true }));

function onPointerUp(event) {
  if (!tap || event.pointerId !== tap.pointerId) return;
  const gesture = tap;
  tap = null;
  const distance = Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y);
  if (!gesture.direction || performance.now() - gesture.startedAt >= HOLD_THRESHOLD || distance > 8) return;
  if (gesture.groupIndex !== activeGroup || gesture.storyIndex !== innerSliders[activeGroup].realIndex) return;
  navigateStory(gesture.direction);
}
function cancelTap() { tap = null; }
function updateInnerLayouts() { innerSliders.forEach(slider => slider.update()); }
document.addEventListener('pointerup', onPointerUp, { capture: true });
document.addEventListener('pointercancel', cancelTap, { capture: true });
window.addEventListener('resize', updateInnerLayouts);
window.addEventListener('pagehide', event => {
  if (event.persisted) return;
  document.removeEventListener('pointerup', onPointerUp, { capture: true });
  document.removeEventListener('pointercancel', cancelTap, { capture: true });
  window.removeEventListener('resize', updateInnerLayouts);
  innerSliders.forEach(slider => slider.destroy());
  groupSlider.destroy();
}, { once: true });
activateGroup(0);
