/**
 * @vitest-environment happy-dom
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { TVIST_CLASSES } from '@core/constants'
import { Tvist } from '@core/Tvist'
import '../../../src/modules/pagination'
import '../../../src/modules/loop'
import '../../../src/modules/drag'
import '../../../src/modules/autoplay'

describe('PaginationModule - Loop Bug Investigation', () => {
  let container: HTMLElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('should track realIndex and activeIndex through two loop cycles', async () => {
    container.innerHTML = `
      <div class="${TVIST_CLASSES.block}">
        <div class="${TVIST_CLASSES.container}">
          <div class="${TVIST_CLASSES.slide}">Slide 1</div>
          <div class="${TVIST_CLASSES.slide}">Slide 2</div>
          <div class="${TVIST_CLASSES.slide}">Slide 3</div>
        </div>
        <div class="${TVIST_CLASSES.pagination}"></div>
      </div>
    `

    const slider = new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
      loop: true,
      speed: 0,
      pagination: {
        clickable: true
      }
    })

    const bullets = container.querySelectorAll(`.${TVIST_CLASSES.bullet}`)
    const log: Array<{ step: string; activeIndex: number; realIndex: number; activeBullet: number }> = []

    const recordState = (step: string) => {
      const activeBulletIndex = Array.from(bullets).findIndex(b => b.classList.contains('active'))
      log.push({
        step,
        activeIndex: slider.activeIndex,
        realIndex: slider.realIndex,
        activeBullet: activeBulletIndex
      })
      console.log(`[${step}] activeIndex=${slider.activeIndex}, realIndex=${slider.realIndex}, activeBullet=${activeBulletIndex}`)
    }

    recordState('Initial')
    expect(slider.realIndex).toBe(0)
    expect(bullets[0].classList.contains('active')).toBe(true)

    // Первый цикл
    slider.scrollTo(1, true)
    recordState('First cycle: 0->1')
    expect(slider.realIndex).toBe(1)
    expect(bullets[1].classList.contains('active')).toBe(true)

    slider.scrollTo(2, true)
    recordState('First cycle: 1->2')
    expect(slider.realIndex).toBe(2)
    expect(bullets[2].classList.contains('active')).toBe(true)

    slider.scrollTo(0, true)
    recordState('First cycle: 2->0 (loop)')
    expect(slider.realIndex).toBe(0)
    expect(bullets[0].classList.contains('active')).toBe(true)

    // Второй цикл
    slider.scrollTo(1, true)
    recordState('Second cycle: 0->1')
    expect(slider.realIndex).toBe(1)
    expect(bullets[1].classList.contains('active')).toBe(true)

    slider.scrollTo(2, true)
    recordState('Second cycle: 1->2')
    expect(slider.realIndex).toBe(2)
    expect(bullets[2].classList.contains('active')).toBe(true)

    slider.scrollTo(0, true)
    recordState('Second cycle: 2->0 (loop)')
    expect(slider.realIndex).toBe(0)
    expect(bullets[0].classList.contains('active')).toBe(true)

    // Выводим полный лог
    console.table(log)
  })

  it('should track data-tvist-slide-index attribute through loop cycles', async () => {
    container.innerHTML = `
      <div class="${TVIST_CLASSES.block}">
        <div class="${TVIST_CLASSES.container}">
          <div class="${TVIST_CLASSES.slide}">Slide 1</div>
          <div class="${TVIST_CLASSES.slide}">Slide 2</div>
          <div class="${TVIST_CLASSES.slide}">Slide 3</div>
        </div>
        <div class="${TVIST_CLASSES.pagination}"></div>
      </div>
    `

    const slider = new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
      loop: true,
      speed: 0,
      pagination: {
        clickable: true
      }
    })

    const getSlideOrder = () => {
      return Array.from(slider.slides).map(slide => ({
        text: slide.textContent?.trim(),
        dataIndex: slide.getAttribute('data-tvist-slide-index')
      }))
    }

    console.log('Initial order:', getSlideOrder())

    // Проходим два полных цикла
    for (let cycle = 1; cycle <= 2; cycle++) {
      slider.scrollTo(1, true)
      console.log(`Cycle ${cycle}, Step 1:`, getSlideOrder())
      console.log(`  activeIndex=${slider.activeIndex}, realIndex=${slider.realIndex}`)
      
      let activeSlide = slider.slides[slider.activeIndex]
      let dataIndex = activeSlide?.getAttribute('data-tvist-slide-index')
      expect(dataIndex).toBe(String(slider.realIndex))

      slider.scrollTo(2, true)
      console.log(`Cycle ${cycle}, Step 2:`, getSlideOrder())
      console.log(`  activeIndex=${slider.activeIndex}, realIndex=${slider.realIndex}`)
      
      activeSlide = slider.slides[slider.activeIndex]
      dataIndex = activeSlide?.getAttribute('data-tvist-slide-index')
      expect(dataIndex).toBe(String(slider.realIndex))

      slider.scrollTo(0, true)
      console.log(`Cycle ${cycle}, Step 3:`, getSlideOrder())
      console.log(`  activeIndex=${slider.activeIndex}, realIndex=${slider.realIndex}`)
      
      activeSlide = slider.slides[slider.activeIndex]
      dataIndex = activeSlide?.getAttribute('data-tvist-slide-index')
      expect(dataIndex).toBe(String(slider.realIndex))
    }
  })

  it('should handle drag during second loop cycle', async () => {
    container.innerHTML = `
      <div class="${TVIST_CLASSES.block}">
        <div class="${TVIST_CLASSES.container}">
          <div class="${TVIST_CLASSES.slide}">Slide 1</div>
          <div class="${TVIST_CLASSES.slide}">Slide 2</div>
          <div class="${TVIST_CLASSES.slide}">Slide 3</div>
        </div>
        <div class="${TVIST_CLASSES.pagination}"></div>
      </div>
    `

    const slider = new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
      loop: true,
      drag: true,
      speed: 0,
      pagination: {
        clickable: true
      }
    })

    const bullets = container.querySelectorAll(`.${TVIST_CLASSES.bullet}`)

    // Проходим полный первый цикл
    slider.scrollTo(1, true)
    slider.scrollTo(2, true)
    slider.scrollTo(0, true)

    // Теперь на втором цикле, переходим к слайду 1
    slider.scrollTo(1, true)

    console.log('Before drag: activeIndex=', slider.activeIndex, 'realIndex=', slider.realIndex)
    expect(slider.realIndex).toBe(1)
    expect(bullets[1].classList.contains('active')).toBe(true)

    // Начинаем драг
    slider.emit('dragStart')
    
    // Эмулируем slideChangeStart во время драга
    slider.emit('slideChangeStart', 2)
    
    // Проверяем что пагинация НЕ обновилась
    console.log('During drag after slideChangeStart: activeBullet=', Array.from(bullets).findIndex(b => b.classList.contains('active')))
    expect(bullets[1].classList.contains('active')).toBe(true)
    expect(bullets[2].classList.contains('active')).toBe(false)

    // Заканчиваем драг
    slider.emit('dragEnd')

    // Snap вернул к слайду 1
    slider.scrollTo(1, true)

    console.log('After drag: activeIndex=', slider.activeIndex, 'realIndex=', slider.realIndex)
    expect(slider.realIndex).toBe(1)
    expect(bullets[1].classList.contains('active')).toBe(true)
  })

  it('should check getCurrentSlideIndex during drag on second cycle', async () => {
    container.innerHTML = `
      <div class="${TVIST_CLASSES.block}">
        <div class="${TVIST_CLASSES.container}">
          <div class="${TVIST_CLASSES.slide}">Slide 1</div>
          <div class="${TVIST_CLASSES.slide}">Slide 2</div>
          <div class="${TVIST_CLASSES.slide}">Slide 3</div>
        </div>
        <div class="${TVIST_CLASSES.pagination}"></div>
      </div>
    `

    const slider = new Tvist(container.querySelector(`.${TVIST_CLASSES.block}`)!, {
      loop: true,
      drag: true,
      speed: 0,
      pagination: {
        clickable: true
      }
    })

    // Получаем доступ к PaginationModule для проверки getCurrentSlideIndex
    const paginationModule = slider.getModule('pagination') as any

    // Проходим полный первый цикл
    slider.scrollTo(1, true)
    slider.scrollTo(2, true)
    slider.scrollTo(0, true)

    // Второй цикл - переходим к слайду 1
    slider.scrollTo(1, true)

    console.log('Second cycle, slide 1:')
    console.log('  activeIndex=', slider.activeIndex)
    console.log('  realIndex=', slider.realIndex)
    console.log('  getCurrentSlideIndex()=', paginationModule?.getCurrentSlideIndex?.())
    
    // Проверяем что getCurrentSlideIndex возвращает правильный realIndex
    if (paginationModule?.getCurrentSlideIndex) {
      expect(paginationModule.getCurrentSlideIndex()).toBe(1)
    }
  })
})
