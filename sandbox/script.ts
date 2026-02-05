import Tvist from '../src/index'

// Инициализация
const slider = new Tvist('#slider', {
  perPage: 1,
  gap: 20,
  speed: 300,
  loop: false
})

console.log('Sandbox initialized!', slider)
