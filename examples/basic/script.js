import '../shared/header.js'
import Tvist from '../../src/index.ts'

// Инициализация
const slider = new Tvist('#slider', {
  perPage: 1,
  gap: 0,
  speed: 300,
  loop: false,
  on: {
    slideChanged: (index) => {
      updateInfo(index)
    }
  }
})

// Кнопки управления
const prevBtn = document.getElementById('prevBtn')
const nextBtn = document.getElementById('nextBtn')
const goToFirst = document.getElementById('goToFirst')
const goToLast = document.getElementById('goToLast')

prevBtn.addEventListener('click', () => slider.prev())
nextBtn.addEventListener('click', () => slider.next())
goToFirst.addEventListener('click', () => slider.scrollTo(0))
goToLast.addEventListener('click', () => slider.scrollTo(4))

// Обновление информации
function updateInfo(index) {
  document.getElementById('currentSlide').textContent = index + 1

  // Обновление состояния кнопок
  prevBtn.disabled = !slider.canScrollPrev
  nextBtn.disabled = !slider.canScrollNext
}

// Начальное состояние
updateInfo(0)

console.log('Tvist initialized!', slider)
console.log('Version:', Tvist.VERSION)
