import '../shared/header.js'
import Tvist from '../../src/index.ts'

// Функция для отображения конфига
function displayConfig(id, config) {
  const el = document.getElementById(id)
  if (el) {
    el.textContent = JSON.stringify(config, null, 2)
  }
}

// Слайдер 1: Drag + Navigation
const config1 = {
  perPage: 1,
  gap: 0,
  drag: true,
  arrows: true,
  rubberband: true,
  speed: 300
}
const slider1 = new Tvist('#slider1', config1)
displayConfig('config1', config1)

// Слайдер 2: Autoplay + Pagination
const config2 = {
  perPage: 1,
  gap: 0,
  drag: false,
  autoplay: 3000,
  pauseOnHover: true,
  pagination: {
    type: 'bullets',
    clickable: true
  }
}
const slider2 = new Tvist('#slider2', config2)
displayConfig('config2', config2)

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

// Слайдер 3: Breakpoints (Container First + Auto Width)
const config3 = {
  // Вместо фиксированного perPage указываем минимальную ширину слайда
  slideMinWidth: 200, 
  perPage: 1, // Fallback
  gap: 20,
  drag: true,
  arrows: true,
  // Включаем режим container query
  breakpointsBase: 'container',
  pagination: {
    type: 'bullets',
    clickable: true
  },
  breakpoints: {
    1024: {
      gap: 15,
      // Можно менять slideMinWidth на разных разрешениях
      slideMinWidth: 180
    },
    768: {
      gap: 10,
      slideMinWidth: 150
    },
    480: {
      gap: 5,
      slideMinWidth: 0, // Отключаем авто-расчет
      perPage: 1        // Принудительно 1 слайд
    }
  }
}
const slider3 = new Tvist('#slider3', config3)
displayConfig('config3', config3)

// Отслеживаем breakpoints
slider3.on('breakpoint', (bp) => {
  const info = document.getElementById('breakpoint-info')
  const width = slider3.engine.containerWidthValue
  info.innerHTML = `<strong>Container Width:</strong> ${Math.round(width)}px | <strong>Breakpoint:</strong> ${bp || 'default'} | <strong>PerPage:</strong> ${slider3.options.perPage}`
})

// Обновляем инфо при ресайзе
slider3.on('resize', () => {
   const info = document.getElementById('breakpoint-info')
   const width = slider3.engine.containerWidthValue
   const bp = slider3.getModule('breakpoints')?.getCurrentBreakpoint()
   info.innerHTML = `<strong>Container Width:</strong> ${Math.round(width)}px | <strong>Breakpoint:</strong> ${bp || 'default'} | <strong>PerPage:</strong> ${slider3.options.perPage}`
})

// Слайдер 4: Fraction
const config4 = {
  perPage: 1,
  gap: 0,
  drag: true,
  arrows: true,
  pagination: {
    type: 'fraction',
    clickable: false
  }
}
const slider4 = new Tvist('#slider4', config4)
displayConfig('config4', config4)

// Логируем события
[slider1, slider2, slider3, slider4].forEach((slider, i) => {
  slider.on('slideChanged', (index) => {
    console.log(`Slider ${i + 1}: active slide = ${index}`)
  })
})

console.log('✅ Все модули инициализированы!')
console.log('Зарегистрированные модули:', Tvist.getRegisteredModules())
