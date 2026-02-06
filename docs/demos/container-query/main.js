import Tvist from '../../../dist/tvist.js'

// Создаем слайдеры
const slider1 = new Tvist('#slider1', {
  perPage: 2,
  gap: 10,
  drag: true
})

const slider2 = new Tvist('#slider2', {
  perPage: 1,
  gap: 15,
  drag: true
})

const slider3 = new Tvist('#slider3', {
  perPage: 3,
  gap: 20,
  drag: true
})

// Функция для отображения информации о размерах
function displayInfo() {
  const sliders = [
    { id: 'slider1', instance: slider1 },
    { id: 'slider2', instance: slider2 },
    { id: 'slider3', instance: slider3 }
  ]

  const infoOutput = document.getElementById('info-output')
  
  const infoHtml = sliders.map(({ id, instance }) => {
    const root = document.getElementById(id)
    const slide = root.querySelector('.tvist-v0__slide')
    const rootWidth = root.offsetWidth
    const slideWidth = slide ? slide.offsetWidth : 0
    const containerSize = instance.engine.containerSizeValue
    const slideSize = instance.engine.slideSizeValue

    return `
      <div class="info-item">
        <strong>${id}:</strong><br>
        Root width: ${rootWidth}px<br>
        Container size (calculated): ${containerSize.toFixed(2)}px<br>
        Slide size (calculated): ${slideSize.toFixed(2)}px<br>
        Slide width (actual DOM): ${slideWidth}px
      </div>
    `
  }).join('')

  infoOutput.innerHTML = infoHtml
}

// Отображаем информацию при загрузке
setTimeout(displayInfo, 100)

// Обновляем информацию при изменении размеров
window.addEventListener('resize', () => {
  setTimeout(displayInfo, 100)
})

// Обновляем информацию каждые 2 секунды
setInterval(displayInfo, 2000)

// Логируем в консоль для отладки
console.log('Sliders initialized:', { slider1, slider2, slider3 })
