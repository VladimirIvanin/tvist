import { Tvist } from 'tvist';

function bindIndexDisplay(slider: Tvist, selector: string): void {
  const el = document.querySelector<HTMLElement>(selector);
  if (!el) return;

  const update = () => {
    el.textContent = String(slider.realIndex);
  };

  slider.on('created', update);
  slider.on('slideChangeEnd', update);
  update();
}

const basicRoot = document.querySelector<HTMLElement>('[data-testid="slider-basic"]');
if (basicRoot) {
  const basicSlider = new Tvist(basicRoot, {
    perPage: 1,
    gap: 0,
    speed: 200,
    loop: false,
    arrows: true,
    pagination: true,
    drag: true,
  });
  bindIndexDisplay(basicSlider, '[data-testid="basic-real-index"]');
}

const loopRoot = document.querySelector<HTMLElement>('[data-testid="slider-loop"]');
if (loopRoot) {
  const loopSlider = new Tvist(loopRoot, {
    perPage: 1,
    gap: 0,
    speed: 0,
    loop: true,
    arrows: true,
    pagination: false,
    drag: true,
  });
  bindIndexDisplay(loopSlider, '[data-testid="loop-real-index"]');
}
