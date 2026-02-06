<template>
  <ExampleCard 
    title="Карточки товаров: сетка → слайдер" 
    description="На десктопе карточки отображаются статичной сеткой (без слайдера), на мобильных устройствах автоматически превращаются в слайдер с перелистыванием."
  >
    <div class="demo-wrapper">
      <div class="demo-section">
        <p class="description">
          Измените ширину окна браузера, чтобы увидеть трансформацию:
          <br>• <strong>Десктоп (≥768px)</strong>: статичная сетка 3×2 без слайдера (enabled: false)
          <br>• <strong>Мобильный (&lt;768px)</strong>: интерактивный слайдер с drag и pagination (enabled: true)
          <br>• Используется встроенная опция <code>enabled</code> в breakpoints
        </p>
        
        <div ref="containerRef" class="products-container">
          <div class="tvist-v0">
            <div class="tvist-v0__container">
              <div 
                v-for="product in products" 
                :key="product.id" 
                class="tvist-v0__slide product-card"
              >
                <div class="product-image" :style="{ background: product.color }">
                  <div class="product-badge" v-if="product.badge">{{ product.badge }}</div>
                </div>
                <div class="product-info">
                  <h4 class="product-title">{{ product.title }}</h4>
                  <p class="product-description">{{ product.description }}</p>
                  <div class="product-footer">
                    <span class="product-price">{{ product.price }}</span>
                    <button class="product-btn">В корзину</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="status-info">
          <div class="status-badge" :class="{ 'is-slider': isSliderMode }">
            {{ isSliderMode ? '📱 Режим слайдера' : '🖥️ Режим сетки' }}
          </div>
          <div v-if="isSliderMode && slider" class="slider-controls">
            <button @click="slider?.prev()" :disabled="!slider?.canScrollPrev">← Prev</button>
            <span class="slide-info">{{ currentSlide }} / {{ totalSlides }}</span>
            <button @click="slider?.next()" :disabled="!slider?.canScrollNext">Next →</button>
          </div>
        </div>
      </div>
    </div>
  </ExampleCard>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { Tvist } from 'tvist'
import ExampleCard from '../ExampleCard.vue'

const containerRef = ref(null)
const slider = ref(null)
const isSliderMode = ref(false)
const currentSlide = ref(1)
const totalSlides = ref(6)

const products = [
  {
    id: 1,
    title: 'Смартфон Galaxy X',
    description: 'Флагманский смартфон с AMOLED дисплеем',
    price: '49 990 ₽',
    color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    badge: 'ХИТ'
  },
  {
    id: 2,
    title: 'Наушники Pro Max',
    description: 'Беспроводные с шумоподавлением',
    price: '24 990 ₽',
    color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    badge: 'NEW'
  },
  {
    id: 3,
    title: 'Умные часы Sport',
    description: 'Фитнес-трекер с GPS и пульсометром',
    price: '12 990 ₽',
    color: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    badge: null
  },
  {
    id: 4,
    title: 'Планшет Tab Pro',
    description: 'Производительный планшет для работы',
    price: '39 990 ₽',
    color: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    badge: '-20%'
  },
  {
    id: 5,
    title: 'Клавиатура Mechanical',
    description: 'Механическая с RGB подсветкой',
    price: '8 990 ₽',
    color: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    badge: null
  },
  {
    id: 6,
    title: 'Мышь Gaming Pro',
    description: 'Игровая мышь с 16000 DPI',
    price: '5 990 ₽',
    color: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
    badge: 'ТОП'
  }
]

const updateSlideInfo = () => {
  if (slider.value) {
    currentSlide.value = slider.value.activeIndex + 1
    totalSlides.value = products.length
  }
}

onMounted(() => {
  if (!containerRef.value) return
  
  const sliderEl = containerRef.value.querySelector('.tvist-v0')
  if (!sliderEl) return

  // Инициализируем слайдер с breakpoints
  slider.value = new Tvist(sliderEl, {
    // По умолчанию (десктоп) - слайдер отключен
    enabled: false,
    perPage: 1,
    gap: 16,
    speed: 300,
    drag: true,
    pagination: {
      type: 'bullets',
      clickable: true
    },
    // Breakpoints: на мобильных включаем слайдер
    breakpoints: {
      767: {
        enabled: true,  // Включаем слайдер на экранах ≤767px
        perPage: 1,
        gap: 16
      }
    },
    on: {
      slideChanged: updateSlideInfo,
      created: (instance) => {
        updateSlideInfo()
        isSliderMode.value = instance.isEnabled
      },
      enabled: () => {
        isSliderMode.value = true
      },
      disabled: () => {
        isSliderMode.value = false
      },
      breakpoint: () => {
        if (slider.value) {
          isSliderMode.value = slider.value.isEnabled
        }
      }
    }
  })
})

onUnmounted(() => {
  slider.value?.destroy()
})
</script>

<style scoped>
.demo-wrapper {
  margin: 20px 0;
  padding: 20px;
  background: #f5f5f5;
  border-radius: 12px;
}

.demo-section {
  margin-bottom: 0;
}

.description {
  margin: 0 0 24px 0;
  font-size: 14px;
  line-height: 1.6;
  color: #666;
}

.description strong {
  color: #667eea;
  font-weight: 600;
}

.products-container {
  margin-bottom: 20px;
}

/* Контейнер слайдера */
.tvist {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  overflow: hidden;
}

/* Когда слайдер отключен (десктоп) - показываем как сетку */
.tvist-v0.tvist-v0--disabled .tvist-v0__container {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  padding: 20px;
  transform: none !important;
}

.tvist-v0.tvist-v0--disabled .tvist-v0__slide {
  width: auto !important;
  margin: 0 !important;
}

.product-card {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  transition: transform 0.2s, box-shadow 0.2s;
  display: flex;
  flex-direction: column;
}

/* В режиме сетки (disabled) - добавляем тень и hover */
.tvist-v0.tvist-v0--disabled .product-card {
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.tvist-v0.tvist-v0--disabled .product-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 16px rgba(0,0,0,0.15);
}

/* В режиме слайдера убираем эффекты */
.tvist:not(.tvist--disabled) .product-card {
  box-shadow: none;
  border-radius: 0;
}

.tvist:not(.tvist--disabled) .product-card:hover {
  transform: none;
}

.product-image {
  width: 100%;
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  color: white;
  font-size: 48px;
}

.product-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  background: rgba(255, 255, 255, 0.95);
  color: #667eea;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.product-info {
  padding: 16px;
  display: flex;
  flex-direction: column;
  flex: 1;
}

.product-title {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.product-description {
  margin: 0 0 16px 0;
  font-size: 13px;
  color: #666;
  line-height: 1.4;
  flex: 1;
}

.product-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.product-price {
  font-size: 18px;
  font-weight: 700;
  color: #667eea;
}

.product-btn {
  background: #667eea;
  color: white;
  border: none;
  padding: 8px 16px;
  font-size: 13px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
  white-space: nowrap;
}

.product-btn:hover {
  background: #5568d3;
}

.status-info {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
}

.status-badge {
  background: white;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #666;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.status-badge.is-slider {
  color: #667eea;
}

.slider-controls {
  display: flex;
  gap: 12px;
  align-items: center;
  background: white;
  padding: 12px 16px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.slider-controls button {
  background: #667eea;
  color: white;
  border: none;
  padding: 8px 16px;
  font-size: 13px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
}

.slider-controls button:hover:not(:disabled) {
  background: #5568d3;
}

.slider-controls button:disabled {
  background: #ccc;
  cursor: not-allowed;
  opacity: 0.7;
}

.slide-info {
  font-size: 14px;
  color: #666;
  font-weight: 500;
  min-width: 60px;
  text-align: center;
}

/* Адаптивность для планшетов */
@media (max-width: 1024px) and (min-width: 768px) {
  .tvist-v0.tvist-v0--disabled .tvist-v0__container {
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }
}
</style>
