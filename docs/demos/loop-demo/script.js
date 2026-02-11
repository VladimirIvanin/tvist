import { Tvist } from '../../../src/index.ts'

// Глобальные переменные для доступа из кнопок
window.slider = null

const infoEl = document.getElementById('info')
const domOrderEl = document.getElementById('domOrder')
const paginationEl = document.getElementById('pagination')
const consoleEl = document.getElementById('console')

function log(message, type = '') {
  const line = document.createElement('div')
  line.className = `console-line ${type}`
  line.textContent = `[${new Date().toLocaleTimeString()}] ${message}`
  consoleEl.appendChild(line)
  consoleEl.scrollTop = consoleEl.scrollHeight
}

function updateInfo() {
  const activeIndex = slider.activeIndex
  const realIndex = slider.realIndex ?? activeIndex
  const totalSlides = slider.slides.length
  const cloneCount = (totalSlides - 4) / 2 // 4 оригинальных слайда
  
  infoEl.innerHTML = `
    <strong>activeIndex:</strong> <span>${activeIndex}</span> (физический индекс в DOM)<br>
    <strong>realIndex:</strong> <span>${realIndex}</span> (логический индекс слайда)<br>
    <strong>Видны слайды:</strong> <span>${getVisibleSlides().join(', ')}</span><br>
    <strong>Всего слайдов:</strong> <span>${totalSlides}</span> (${cloneCount} prepend + 4 оригинала + ${cloneCount} append)
  `

  // Обновляем DOM state
  const slides = slider.slides
  domOrderEl.innerHTML = slides.map((slide, i) => {
    const realIdx = slide.getAttribute('data-tvist-slide-index')
    const isClone = slide.getAttribute('data-tvist-clone') === 'true'
    const isActive = i === activeIndex
    const label = isClone ? `C${parseInt(realIdx) + 1}` : `${parseInt(realIdx) + 1}`
    return `<span class="slide-item ${isActive ? 'active' : ''} ${isClone ? 'clone' : ''}">[${i}] ${label}</span>`
  }).join('')

  // Обновляем пагинацию
  const dots = paginationEl.querySelectorAll('.pagination-dot')
  dots.forEach((dot, i) => {
    dot.classList.toggle('active', i === realIndex)
  })
}

function getVisibleSlides() {
  const slides = slider.slides
  const activeIndex = slider.activeIndex
  const visible = []
  for (let i = activeIndex; i < activeIndex + 2 && i < slides.length; i++) {
    const realIdx = parseInt(slides[i].getAttribute('data-tvist-slide-index'))
    visible.push(realIdx + 1)
  }
  return visible
}

// Инициализация слайдера
window.slider = new Tvist('#slider', {
  perPage: 2,
  gap: 20,
  loop: true,
  drag: true,
  speed: 300,
  on: {
    created: () => {
      log('✅ Slider created with loop: true', 'event')
      // Используем setTimeout, чтобы slider был уже присвоен к window
      setTimeout(() => {
        log(`Initial state: activeIndex=${slider.activeIndex}, realIndex=${slider.realIndex}`, 'dom')
      }, 0)
    },
    beforeSlideChange: (index) => {
      const activeIndex = slider.activeIndex
      const realIndex = slider.realIndex
      log(`📍 beforeSlideChange: realIndex=${index}, current: activeIndex=${activeIndex}, realIndex=${realIndex}`, 'event')
    },
    slideChangeEnd: (index) => {
      const activeIndex = slider.activeIndex
      const realIndex = slider.realIndex
      const position = slider.engine.location.get()
      const slides = slider.slides
      const currentSlide = slides[activeIndex]
      const isClone = currentSlide?.getAttribute('data-tvist-clone') === 'true'
      const slideIndex = currentSlide?.getAttribute('data-tvist-slide-index')
      
      log(`✨ slideChangeEnd: realIndex=${index}`, 'event')
      log(`   → activeIndex=${activeIndex}, position=${position.toFixed(0)}px`, 'dom')
      log(`   → current slide: [${activeIndex}] data-index=${slideIndex}, isClone=${isClone}`, 'dom')
      updateInfo()
    }
  }
})

// Перехватываем prev/next для логирования
const originalPrev = slider.prev.bind(slider)
const originalNext = slider.next.bind(slider)

slider.prev = function() {
  log(`⬅️ PREV called: from activeIndex=${slider.activeIndex}, realIndex=${slider.realIndex}`, 'event')
  return originalPrev()
}

slider.next = function() {
  log(`➡️ NEXT called: from activeIndex=${slider.activeIndex}, realIndex=${slider.realIndex}`, 'event')
  return originalNext()
}

// Клики по пагинации
paginationEl.addEventListener('click', (e) => {
  const dot = e.target.closest('.pagination-dot')
  if (dot) {
    const index = parseInt(dot.dataset.index)
    log(`🎯 Pagination click: goTo(${index})`)
    slider.scrollTo(index, true)
  }
})

// Начальное обновление
updateInfo()
log('Demo loaded. Try Prev/Next buttons or pagination dots.')
