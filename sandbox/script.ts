import Tvist from '../src/index'

// Слайдер 1: Autoplay + Visibility
const slider1 = new Tvist('#slider1', {
  perPage: 1,
  gap: 20,
  autoplay: {
    delay: 2000,
  },
  visibility: true,
  on: {
    sliderHidden: () => {
      console.log('🙈 Слайдер 1 скрыт - autoplay приостановлен')
    },
    sliderVisible: () => {
      console.log('👁️ Слайдер 1 виден - autoplay возобновлен')
    },
    slideChangeEnd: (index) => {
      console.log('Слайдер 1: переход на слайд', index)
    }
  }
})

// Кнопка переключения видимости слайдера 1
const toggleSlider1Btn = document.getElementById('toggleSlider1')
const slider1Container = document.getElementById('slider1Container')

if (toggleSlider1Btn && slider1Container) {
  toggleSlider1Btn.addEventListener('click', () => {
    if (slider1Container.style.display === 'none') {
      slider1Container.style.display = 'block'
    } else {
      slider1Container.style.display = 'none'
    }
  })
}

// Слайдер 2: Marquee + Visibility
const slider2 = new Tvist('#slider2', {
  perPage: 3,
  gap: 20,
  marquee: {
    speed: 50,
    direction: 'left',
  },
  visibility: true,
  on: {
    sliderHidden: () => {
      console.log('🙈 Слайдер 2 скрыт - marquee приостановлен')
    },
    sliderVisible: () => {
      console.log('👁️ Слайдер 2 виден - marquee возобновлен')
    }
  }
})

// Кнопка переключения видимости слайдера 2
const toggleSlider2Btn = document.getElementById('toggleSlider2')
const slider2Container = document.getElementById('slider2Container')

if (toggleSlider2Btn && slider2Container) {
  toggleSlider2Btn.addEventListener('click', () => {
    if (slider2Container.style.display === 'none') {
      slider2Container.style.display = 'block'
    } else {
      slider2Container.style.display = 'none'
    }
  })
}

console.log('Visibility test initialized!', { slider1, slider2 })

// Expose for debugging
;(window as any).sliders = { slider1, slider2 }
