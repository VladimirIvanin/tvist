import '../shared/header.js'
import Tvist from '../../src/index.ts'

// Demo 1: Simple Vertical Slider
const sliderSimple = new Tvist('#slider-simple', {
  direction: 'vertical',
  perPage: 2,
  gap: 15,
  loop: false
})

// Buttons for Demo 1
document.getElementById('prevBtn').addEventListener('click', () => sliderSimple.prev())
document.getElementById('nextBtn').addEventListener('click', () => sliderSimple.next())


// Demo 2: Gallery with Vertical Thumbs
const thumbsVertical = new Tvist('#thumbs-vertical', {
  direction: 'vertical',
  slideMinSize: 90, // Автоматический расчет perPage на основе высоты
  gap: 10,
  isNavigation: true, // Включает кликабельность и active классы
})

const mainHorizontal = new Tvist('#main-horizontal', {
  direction: 'horizontal',
  perPage: 1,
  gap: 10,
  speed: 500,
  // Эффект slide по умолчанию
})

// Синхронизация
// Когда листаем main -> листается thumbs (и меняется active класс)
// Когда кликаем thumbs -> листается main
mainHorizontal.sync(thumbsVertical)

console.log('Vertical demos initialized')
