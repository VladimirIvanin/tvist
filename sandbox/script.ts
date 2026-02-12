import Tvist from '../src/index'

// Обновление ширины окна
function updateWindowWidth() {
  const el = document.getElementById('windowWidth')
  if (el) {
    el.textContent = window.innerWidth.toString()
  }
}

updateWindowWidth()
window.addEventListener('resize', updateWindowWidth)

// Слайдер 1: Window-based breakpoints
const slider1 = new Tvist('#slider1', {
  perPage: 4,
  gap: 20,
  arrows: true,
  pagination: true,
  breakpoints: {
    1200: {
      perPage: 3,
      gap: 16
    },
    768: {
      perPage: 1,
      gap: 0
    }
  },
  on: {
    created: (instance) => {
      updateSlider1Info(instance)
    },
    breakpoint: (bp) => {
      console.log('Slider 1 breakpoint:', bp)
      updateSlider1Info(slider1)
    },
    slideChangeEnd: () => {
      updateSlider1Info(slider1)
    }
  }
})

function updateSlider1Info(slider: typeof slider1) {
  const perPageEl = document.getElementById('slider1-perPage')
  const bpEl = document.getElementById('slider1-bp')
  if (perPageEl) perPageEl.textContent = slider.options.perPage?.toString() ?? '-'
  if (bpEl) {
    const breakpointsModule = (slider as any).modules?.get('breakpoints')
    const currentBp = breakpointsModule?.getCurrentBreakpoint()
    bpEl.textContent = currentBp !== null ? currentBp.toString() : 'none'
  }
}

// Слайдер 2: Container-based
const slider2 = new Tvist('#slider2', {
  perPage: 3,
  gap: 12,
  arrows: true,
  breakpointsBase: 'container',
  breakpoints: {
    500: {
      perPage: 2,
      gap: 8
    },
    400: {
      perPage: 1,
      gap: 0
    }
  },
  on: {
    created: (instance) => {
      updateSlider2Info(instance)
    },
    breakpoint: (bp) => {
      console.log('Slider 2 breakpoint:', bp)
      updateSlider2Info(slider2)
    },
    slideChangeEnd: () => {
      updateSlider2Info(slider2)
    }
  }
})

function updateSlider2Info(slider: typeof slider2) {
  const perPageEl = document.getElementById('slider2-perPage')
  const bpEl = document.getElementById('slider2-bp')
  if (perPageEl) perPageEl.textContent = slider.options.perPage?.toString() ?? '-'
  if (bpEl) {
    const breakpointsModule = (slider as any).modules?.get('breakpoints')
    const currentBp = breakpointsModule?.getCurrentBreakpoint()
    bpEl.textContent = currentBp !== null ? currentBp.toString() : 'none'
  }
}

// Слайдер 3: Lock/Unlock
const slider3 = new Tvist('#slider3', {
  perPage: 2,
  gap: 16,
  arrows: true,
  pagination: true,
  breakpoints: {
    768: {
      perPage: 1
    }
  },
  on: {
    created: (instance) => {
      updateSlider3Info(instance)
    },
    breakpoint: (bp) => {
      console.log('Slider 3 breakpoint:', bp)
      updateSlider3Info(slider3)
    },
    lock: () => {
      console.log('Slider 3 locked')
      updateSlider3Info(slider3)
    },
    unlock: () => {
      console.log('Slider 3 unlocked')
      updateSlider3Info(slider3)
    },
    slideChangeEnd: () => {
      updateSlider3Info(slider3)
    }
  }
})

function updateSlider3Info(slider: typeof slider3) {
  const perPageEl = document.getElementById('slider3-perPage')
  const lockedEl = document.getElementById('slider3-locked')
  if (perPageEl) perPageEl.textContent = slider.options.perPage?.toString() ?? '-'
  if (lockedEl) lockedEl.textContent = slider.engine.isLocked ? 'YES' : 'NO'
}

console.log('Breakpoints test initialized!', { slider1, slider2, slider3 })

// Expose for debugging
;(window as any).sliders = { slider1, slider2, slider3 }
