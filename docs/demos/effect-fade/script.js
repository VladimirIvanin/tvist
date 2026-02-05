import Tvist from '../../../src/index.ts'

// Инициализация
const slider = new Tvist('#slider', {
  effect: 'fade',
  fadeEffect: {
    crossFade: false
  },
  speed: 600,
  loop: true
})

// Управление
const prevBtn = document.getElementById('prevBtn')
const nextBtn = document.getElementById('nextBtn')
const crossFadeToggle = document.getElementById('crossFadeToggle')

prevBtn.addEventListener('click', () => slider.prev())
nextBtn.addEventListener('click', () => slider.next())

crossFadeToggle.addEventListener('change', (e) => {
    slider.options.fadeEffect.crossFade = e.target.checked
    slider.update()
})

console.log('Tvist Fade initialized!', slider)
