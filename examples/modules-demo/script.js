import '../shared/header.js'
import Tvist from '../../src/index.ts'

// Слайдер 1: Drag + Navigation
const slider1 = new Tvist('#slider1', {
  perPage: 1,
  gap: 0,
  drag: true,
  arrows: true,
  rubberband: true,
  speed: 300
})

// Слайдер 2: Autoplay + Pagination
const slider2 = new Tvist('#slider2', {
  perPage: 1,
  gap: 0,
  drag: false,
  autoplay: 3000,
  pauseOnHover: true,
  pagination: {
    type: 'bullets',
    clickable: true
  }
})

// Управление autoplay
const autoplayModule = slider2.getModule('autoplay')
document.getElementById('start-autoplay').addEventListener('click', () => {
  if (autoplayModule) {
    autoplayModule.getAutoplay().start()
  }
})
document.getElementById('stop-autoplay').addEventListener('click', () => {
  if (autoplayModule) {
    autoplayModule.getAutoplay().stop()
  }
})

// Слайдер 3: Breakpoints
const slider3 = new Tvist('#slider3', {
  perPage: 4,
  gap: 20,
  drag: true,
  arrows: true,
  pagination: {
    type: 'bullets',
    clickable: true
  },
  breakpoints: {
    1024: {
      perPage: 3,
      gap: 15
    },
    768: {
      perPage: 2,
      gap: 10
    },
    480: {
      perPage: 1,
      gap: 0
    }
  }
})

// Отслеживаем breakpoints
slider3.on('breakpoint', (bp) => {
  const info = document.getElementById('breakpoint-info')
  let name = 'desktop (4 слайда)'
  if (bp === 1024) name = 'laptop (3 слайда)'
  if (bp === 768) name = 'tablet (2 слайда)'
  if (bp === 480) name = 'mobile (1 слайд)'
  info.innerHTML = `<strong>Текущий breakpoint:</strong> ${name}`
})

// Слайдер 4: Fraction
const slider4 = new Tvist('#slider4', {
  perPage: 1,
  gap: 0,
  drag: true,
  arrows: true,
  pagination: {
    type: 'fraction',
    clickable: false
  }
})

// Логируем события
[slider1, slider2, slider3, slider4].forEach((slider, i) => {
  slider.on('slideChanged', (index) => {
    console.log(`Slider ${i + 1}: active slide = ${index}`)
  })
})

console.log('✅ Все модули инициализированы!')
console.log('Зарегистрированные модули:', Tvist.getRegisteredModules())
