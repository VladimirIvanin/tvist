import Tvist from '../src/index'

let switchCounter = 0
let startTime = Date.now()

function updateInfo(slider: Tvist) {
  const info = document.getElementById('info1')
  if (!info) return
  
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
  const autoplay = slider.autoplay
  
  info.innerHTML = `
    <strong>Текущий слайд:</strong> ${slider.activeIndex + 1} из ${slider.engine.slideCount}<br>
    <strong>Счётчик переключений:</strong> ${switchCounter}<br>
    <strong>Время работы:</strong> ${elapsed}с<br>
    <strong>Autoplay:</strong> ${autoplay.isRunning() ? '▶️ Running' : autoplay.isPaused() ? '⏸️ Paused' : '⏹️ Stopped'}<br>
    <strong>Видимость страницы:</strong> ${document.visibilityState === 'visible' ? '👁️ Visible' : '🙈 Hidden'}
  `
  info.style.cssText = `
    padding: 15px;
    margin: 20px 0;
    background: #e3f2fd;
    border: 2px solid #1976d2;
    border-radius: 8px;
    font-size: 16px;
    font-family: monospace;
  `
}

// Autoplay test slider
const slider1 = new Tvist('#slider1', {
  autoplay: 2000, // 2 секунды
  pauseOnHover: true,
  loop: true,
  arrows: true,
  pagination: {
    enabled: true,
    clickable: true
  }
})

// Обновляем информацию при каждом переключении
slider1.on('slideChanged', () => {
  switchCounter++
  updateInfo(slider1)
  console.log(`Slide changed to ${slider1.activeIndex}, counter: ${switchCounter}`)
})

// Обновляем при событиях autoplay
slider1.on('autoplayStart', () => {
  console.log('Autoplay started')
  updateInfo(slider1)
})

slider1.on('autoplayPause', () => {
  console.log('Autoplay paused')
  updateInfo(slider1)
})

slider1.on('autoplayResume', () => {
  console.log('Autoplay resumed')
  updateInfo(slider1)
})

// Отслеживаем видимость страницы
document.addEventListener('visibilitychange', () => {
  console.log('Visibility changed:', document.visibilityState)
  updateInfo(slider1)
})

// Initial update
setTimeout(() => {
  updateInfo(slider1)
}, 100)

// Update every second to show elapsed time
setInterval(() => {
  updateInfo(slider1)
}, 1000)

console.log('Autoplay test initialized!', { slider1 })

// Expose for debugging
;(window as any).slider = slider1
;(window as any).resetCounter = () => {
  switchCounter = 0
  startTime = Date.now()
  updateInfo(slider1)
}
