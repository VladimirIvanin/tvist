import '../shared/header.js'
import Tvist from '../../src/index.ts'

// Инициализация
const slider = new Tvist('#slider', {
  effect: 'cube',
  cubeEffect: {
    slideShadows: true,
    shadow: true,
    shadowOffset: 20,
    shadowScale: 0.94
  },
  speed: 600,
  loop: true
})

// Управление
const prevBtn = document.getElementById('prevBtn')
const nextBtn = document.getElementById('nextBtn')
const shadowsToggle = document.getElementById('shadowsToggle')

prevBtn.addEventListener('click', () => slider.prev())
nextBtn.addEventListener('click', () => slider.next())

shadowsToggle.addEventListener('change', (e) => {
    slider.options.cubeEffect.slideShadows = e.target.checked
    slider.options.cubeEffect.shadow = e.target.checked
    slider.update()
})

console.log('Tvist Cube initialized!', slider)
