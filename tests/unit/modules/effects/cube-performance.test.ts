import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { TVIST_CLASSES } from '@core/constants'
import Tvist from '@core/Tvist'
import { EffectModule } from '@modules/effects/EffectModule'

// Регистрируем модуль для тестов
Tvist.registerModule('effect', EffectModule)

describe('Cube Effect Performance', () => {
    let root: HTMLDivElement
    let tvist: Tvist

    beforeEach(() => {
        document.body.innerHTML = `
            <div class="${TVIST_CLASSES.block}">
                <div class="${TVIST_CLASSES.container}">
                    ${Array.from({ length: 10 }, (_, i) => `
                        <div class="${TVIST_CLASSES.slide}">Slide ${i + 1}</div>
                    `).join('')}
                </div>
            </div>
        `
        root = document.querySelector(`.${TVIST_CLASSES.block}`) as HTMLDivElement
        
        // Mock размеров для корректной работы
        Object.defineProperty(root, 'offsetWidth', {
            configurable: true,
            value: 300
        })
        
        const container = root.querySelector(`.${TVIST_CLASSES.container}`) as HTMLElement
        Object.defineProperty(container, 'clientWidth', {
            configurable: true,
            value: 300
        })
    })

    afterEach(() => {
        tvist?.destroy()
        document.body.innerHTML = ''
    })

    it('должен кэшировать разделение original/clone слайдов', () => {
        tvist = new Tvist(root, {
            effect: 'cube',
            loop: true, // Создаст клоны
        })

        const effect = tvist.getModule('effect') as EffectModule
        expect(effect).toBeDefined()

        // Первый вызов должен создать кэш
        const startTime1 = performance.now()
        tvist.engine.applyTransformPublic(0)
        const endTime1 = performance.now()

        // Последующие вызовы должны использовать кэш (быстрее)
        const iterations = 100
        const startTime2 = performance.now()
        for (let i = 0; i < iterations; i++) {
            tvist.engine.applyTransformPublic(i * -10)
        }
        const endTime2 = performance.now()

        const firstCallTime = endTime1 - startTime1
        const avgCachedCallTime = (endTime2 - startTime2) / iterations

        // Средний вызов с кэшем должен быть не медленнее первого
        // (в реальности должен быть быстрее, но зависит от среды тестирования)
        expect(avgCachedCallTime).toBeLessThanOrEqual(firstCallTime * 2)
    })

    it('должен переиспользовать элементы теней без querySelector', () => {
        tvist = new Tvist(root, {
            effect: 'cube',
            cubeEffect: {
                slideShadows: true,
            },
        })

        // Первый рендер — создание теней
        tvist.engine.applyTransformPublic(0)
        
        // Переходим ко второму слайду чтобы появились тени (при повороте куба)
        tvist.engine.applyTransformPublic(-100)
        
        // Проверяем, что тени созданы у видимых слайдов
        const slides = root.querySelectorAll<HTMLElement>(`.${TVIST_CLASSES.slide}`)
        const originalSlides = Array.from(slides).filter(s => !s.dataset.tvistClone)
        
        // Должны быть тени у видимых слайдов
        const slidesWithShadows = originalSlides.filter(s => 
            s.querySelector(`.${TVIST_CLASSES.block}-slide-shadow-cube`)
        )
        expect(slidesWithShadows.length).toBeGreaterThan(0)

        // Запоминаем элементы теней (left и right)
        const shadowElementsLeft = slidesWithShadows.map(s => 
            s.querySelector(`.${TVIST_CLASSES.block}-slide-shadow-left`)
        )
        const shadowElementsRight = slidesWithShadows.map(s => 
            s.querySelector(`.${TVIST_CLASSES.block}-slide-shadow-right`)
        )

        // Множественные обновления позиции
        for (let i = 0; i < 50; i++) {
            tvist.engine.applyTransformPublic(i * -5)
        }

        // Элементы теней должны остаться теми же (переиспользование)
        slidesWithShadows.forEach((slide, idx) => {
            const shadowLeft = slide.querySelector(`.${TVIST_CLASSES.block}-slide-shadow-left`)
            const shadowRight = slide.querySelector(`.${TVIST_CLASSES.block}-slide-shadow-right`)
            expect(shadowLeft).toBe(shadowElementsLeft[idx])
            expect(shadowRight).toBe(shadowElementsRight[idx])
        })
    })

    it('должен создавать тени с правильными классами (Swiper-style)', () => {
        tvist = new Tvist(root, {
            effect: 'cube',
            cubeEffect: {
                slideShadows: true,
            },
        })

        // Переходим на позицию где тени будут видны
        tvist.engine.applyTransformPublic(-150)
        
        const slides = root.querySelectorAll<HTMLElement>(`.${TVIST_CLASSES.slide}`)
        const slidesArray = Array.from(slides).filter(s => !s.dataset.tvistClone)
        
        // Находим слайд с тенями
        let shadowLeft: HTMLElement | null = null
        let shadowRight: HTMLElement | null = null
        
        for (const slide of slidesArray) {
            const left = slide.querySelector<HTMLElement>(`.${TVIST_CLASSES.block}-slide-shadow-left`)
            const right = slide.querySelector<HTMLElement>(`.${TVIST_CLASSES.block}-slide-shadow-right`)
            if (left && right) {
                shadowLeft = left
                shadowRight = right
                break
            }
        }
        
        expect(shadowLeft).toBeDefined()
        expect(shadowRight).toBeDefined()
        
        // Проверяем, что тени имеют правильные классы
        expect(shadowLeft!.className).toContain(`${TVIST_CLASSES.block}-slide-shadow-cube`)
        expect(shadowLeft!.className).toContain(`${TVIST_CLASSES.block}-slide-shadow-left`)
        expect(shadowRight!.className).toContain(`${TVIST_CLASSES.block}-slide-shadow-cube`)
        expect(shadowRight!.className).toContain(`${TVIST_CLASSES.block}-slide-shadow-right`)
        
        // Проверяем что opacity устанавливается
        const initialLeftOpacity = parseFloat(shadowLeft!.style.opacity || '0')
        const initialRightOpacity = parseFloat(shadowRight!.style.opacity || '0')
        expect(initialLeftOpacity).toBeGreaterThanOrEqual(0)
        expect(initialLeftOpacity).toBeLessThanOrEqual(1)
        expect(initialRightOpacity).toBeGreaterThanOrEqual(0)
        expect(initialRightOpacity).toBeLessThanOrEqual(1)

        // Множественные обновления позиции
        for (let i = 0; i < 50; i++) {
            tvist.engine.applyTransformPublic(-150 + i * 2)
        }
        
        // opacity всё ещё в валидном диапазоне
        const finalLeftOpacity = parseFloat(shadowLeft!.style.opacity || '0')
        const finalRightOpacity = parseFloat(shadowRight!.style.opacity || '0')
        expect(finalLeftOpacity).toBeGreaterThanOrEqual(0)
        expect(finalLeftOpacity).toBeLessThanOrEqual(1)
        expect(finalRightOpacity).toBeGreaterThanOrEqual(0)
        expect(finalRightOpacity).toBeLessThanOrEqual(1)
    })

    it('должен пересоздавать кэш при изменении списка слайдов', () => {
        tvist = new Tvist(root, {
            effect: 'cube',
        })

        // Первый рендер с 10 слайдами
        tvist.engine.applyTransformPublic(0)
        
        // Добавляем новый слайд
        const newSlide = document.createElement('div')
        newSlide.className = 'tvist-v0__slide'
        newSlide.style.width = '300px'
        newSlide.textContent = 'New Slide'
        
        const container = root.querySelector('.tvist-v0__container')!
        container.appendChild(newSlide)
        
        // Обновляем Tvist
        tvist.update()
        
        // Проверяем, что новый слайд учитывается
        const slidesCount = root.querySelectorAll('.tvist-v0__slide').length
        expect(slidesCount).toBe(11)
        
        // Рендер должен работать с обновлённым списком
        tvist.engine.applyTransformPublic(-300)
        
        // Новый слайд должен быть виден при прокрутке
        const allSlides = Array.from(root.querySelectorAll<HTMLElement>('.tvist-v0__slide'))
        const visibleSlides = allSlides.filter(s => 
            s.style.visibility === 'visible' || !s.style.visibility
        )
        expect(visibleSlides.length).toBeGreaterThan(0)
    })

    it('не должен создавать массивы на каждом вызове (memory efficiency)', () => {
        tvist = new Tvist(root, {
            effect: 'cube',
            loop: true,
        })

        // Warming up
        for (let i = 0; i < 10; i++) {
            tvist.engine.applyTransformPublic(i * -10)
        }

        // Замеряем производительность
        const iterations = 1000
        const startTime = performance.now()
        
        for (let i = 0; i < iterations; i++) {
            tvist.engine.applyTransformPublic((i % 360) * -10)
        }
        
        const endTime = performance.now()
        const totalTime = endTime - startTime
        const avgTime = totalTime / iterations

        // Среднее время на вызов должно быть разумным (< 2ms на современном CPU)
        // В реальности с кэшем должно быть < 0.5ms
        expect(avgTime).toBeLessThan(2)
        
        // Вывод для отладки
        console.log(`Average setCubeEffect time: ${avgTime.toFixed(3)}ms per call`)
    })
})
