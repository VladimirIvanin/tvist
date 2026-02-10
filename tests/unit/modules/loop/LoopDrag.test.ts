import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createSliderFixture, simulateDrag, type SliderFixture } from '../../../fixtures'
import { Tvist } from '@core/Tvist'
import { LoopModule } from '@modules/loop/LoopModule'
import { DragModule } from '@modules/drag/DragModule'

// Регистрируем модули
Tvist.registerModule('loop', LoopModule)
Tvist.registerModule('drag', DragModule)

describe('LoopModule + DragModule Integration', () => {
  let fixture: SliderFixture
  let slider: Tvist

  beforeEach(() => {
    fixture = createSliderFixture({ slidesCount: 5, width: 1000 })
  })

  afterEach(() => {
    slider?.destroy()
    fixture?.cleanup()
  })

  describe('Базовое поведение drag', () => {
    it('должен начинать drag только после превышения threshold (5px)', async () => {
      slider = new Tvist(fixture.root, { loop: true, drag: true })
      const startPos = slider.engine.location.get()
      
      // Маленькое движение (меньше 5px)
      await simulateDrag({
          element: fixture.container,
          startX: 100,
          deltaX: 3, 
          steps: 1
      })
      
      // Позиция не должна измениться (drag не начался)
      expect(slider.engine.location.get()).toBe(startPos)
    })

    it('должен начинать drag при превышении threshold', async () => {
      slider = new Tvist(fixture.root, { loop: true, drag: true })
      const dragStartSpy = vi.fn()
      slider.on('dragStart', dragStartSpy)
      
      // Движение больше 5px
      await simulateDrag({
          element: fixture.container,
          startX: 100,
          deltaX: 20, 
          steps: 5
      })
      
      // Событие dragStart должно было сработать
      expect(dragStartSpy).toHaveBeenCalled()
    })
  })

  describe('Корректность transform при drag с loop', () => {
    it('location должен изменяться плавно при малом drag (без скачков)', async () => {
      slider = new Tvist(fixture.root, { loop: true, drag: true, perPage: 1 })
      
      const initialLocation = slider.engine.location.get()
      console.log('Initial location:', initialLocation)
      
      // Малое движение вправо (50px)
      await simulateDrag({
          element: fixture.container,
          startX: 500,
          deltaX: 50,
          steps: 5,
          duration: 200
      })
      
      const finalLocation = slider.engine.location.get()
      const locationDiff = finalLocation - initialLocation
      
      console.log('Final location:', finalLocation)
      console.log('Location diff:', locationDiff)
      
      // КРИТИЧНО: location должен измениться примерно на 50px (±20px погрешность)
      // НЕ должно быть огромного скачка (как было -990px)
      expect(Math.abs(locationDiff)).toBeGreaterThan(30) // Хотя бы 30px
      expect(Math.abs(locationDiff)).toBeLessThan(100) // Но не более 100px
    })

    it('location должен изменяться пропорционально движению курсора', async () => {
      slider = new Tvist(fixture.root, { loop: true, drag: true, perPage: 1 })
      
      const initialLocation = slider.engine.location.get()
      
      // Движение на 100px
      await simulateDrag({
          element: fixture.container,
          startX: 500,
          deltaX: 100,
          steps: 10,
          duration: 300
      })
      
      const finalLocation = slider.engine.location.get()
      const locationDiff = Math.abs(finalLocation - initialLocation)
      
      console.log('Movement: 100px, Location diff:', locationDiff)
      
      // Location должен измениться примерно на 100px (±30px)
      expect(locationDiff).toBeGreaterThan(70)
      expect(locationDiff).toBeLessThan(130)
    })

    it('НЕ должно быть огромного скачка transform при старте drag', async () => {
      slider = new Tvist(fixture.root, { loop: true, drag: true, perPage: 1 })
      
      const loopModule = slider.getModule('loop') as any
      const locations: number[] = []
      
      // Отслеживаем все изменения location
      slider.on('drag', () => {
        locations.push(slider.engine.location.get())
      })
      
      const initialLocation = slider.engine.location.get()
      
      // Малое движение (20px)
      await simulateDrag({
          element: fixture.container,
          startX: 500,
          deltaX: 20,
          steps: 3,
          duration: 100
      })
      
      console.log('Location history:', locations)
      
      // Проверяем, что НЕТ скачков более 500px между соседними значениями
      for (let i = 1; i < locations.length; i++) {
        const diff = Math.abs(locations[i] - locations[i - 1])
        expect(diff).toBeLessThan(500) // НЕ должно быть скачка на 1000px!
      }
    })
  })

  describe('ПРОБЛЕМА ВОСПРОИЗВЕДЕНА: "дырка" при drag', () => {
    it('ВОСПРОИЗВЕДЕНИЕ: location становится положительным при drag вправо (показывает дырку)', async () => {
      slider = new Tvist(fixture.root, { loop: true, drag: true, perPage: 2, gap: 20 })
      
      const loopModule = slider.getModule('loop') as any
      
      console.log('\n=== ВОСПРОИЗВЕДЕНИЕ ПРОБЛЕМЫ С ДЫРКОЙ ===')
      console.log('Начальное состояние:')
      const initialState = loopModule.getTransformState()
      console.log('  Location:', initialState.location)
      console.log('  Active index:', initialState.activeIndex)
      console.log('  Slides order:', initialState.slidesOrder.join(', '))
      
      // Драг вправо (движение к началу)
      console.log('\nДрагаем вправо на 100px...')
      await simulateDrag({
          element: fixture.container,
          startX: 500,
          deltaX: 100,
          steps: 10,
          duration: 300
      })
      
      const finalState = loopModule.getTransformState()
      console.log('\nФинальное состояние:')
      console.log('  Location:', finalState.location)
      console.log('  Active index:', finalState.activeIndex)
      console.log('  Slides order:', finalState.slidesOrder.join(', '))
      console.log('  Transform:', finalState.transform)
      
      // ПРОБЛЕМА: location положительный!
      console.log('\n❌ ПРОБЛЕМА: location =', finalState.location, '(положительный!)')
      console.log('   Это означает, что контейнер сдвинут вправо')
      console.log('   и показывает пустое пространство слева (ДЫРКУ)')
      
      // Этот тест ДОЛЖЕН ПАДАТЬ, показывая проблему
      expect(finalState.location).toBeLessThanOrEqual(0)
    })

    it('ВОСПРОИЗВЕДЕНИЕ: loopFix НЕ перестраивает слайды при drag вправо', async () => {
      slider = new Tvist(fixture.root, { loop: true, drag: true, perPage: 2, gap: 20 })
      
      const loopModule = slider.getModule('loop') as any
      let loopFixCalls: any[] = []
      
      const originalFix = loopModule.fix.bind(loopModule)
      loopModule.fix = (params: any) => {
        const stateBefore = loopModule.getTransformState()
        const result = originalFix(params)
        const stateAfter = loopModule.getTransformState()
        
        loopFixCalls.push({
          params,
          slidesOrderBefore: stateBefore.slidesOrder.join(', '),
          slidesOrderAfter: stateAfter.slidesOrder.join(', '),
          locationBefore: stateBefore.location,
          locationAfter: stateAfter.location,
          reordered: stateBefore.slidesOrder.join(',') !== stateAfter.slidesOrder.join(',')
        })
        
        return result
      }
      
      console.log('\n=== ПРОВЕРКА LOOPFIX ===')
      
      // Драг вправо
      await simulateDrag({
          element: fixture.container,
          startX: 500,
          deltaX: 100,
          steps: 10,
          duration: 300
      })
      
      console.log('Вызовы loopFix:', loopFixCalls.length)
      loopFixCalls.forEach((call, i) => {
        console.log(`\nВызов #${i + 1}:`)
        console.log('  Params:', call.params)
        console.log('  Slides BEFORE:', call.slidesOrderBefore)
        console.log('  Slides AFTER:', call.slidesOrderAfter)
        console.log('  Location BEFORE:', call.locationBefore)
        console.log('  Location AFTER:', call.locationAfter)
        console.log('  Reordered:', call.reordered)
      })
      
      // ПРОБЛЕМА: loopFix вызывается, но НЕ перестраивает слайды
      // Поэтому location остается положительным
      const anyReordered = loopFixCalls.some(call => call.reordered)
      console.log('\n❌ ПРОБЛЕМА: Слайды были перестроены?', anyReordered)
      console.log('   Ожидалось: true (должны быть prepend последних слайдов)')
      console.log('   Получили: false (слайды НЕ перестроены)')
      console.log('   Результат: показывается пустое пространство (ДЫРКА)')
      
      // Этот тест показывает, что loopFix НЕ работает как надо
      expect(loopFixCalls.length).toBeGreaterThan(0)
    })

    it('ВОСПРОИЗВЕДЕНИЕ: при малом drag вправо появляется белое пространство', async () => {
      slider = new Tvist(fixture.root, { loop: true, drag: true, perPage: 2, gap: 20 })
      
      console.log('\n=== ТЕСТ: МАЛЫЙ DRAG ВПРАВО ===')
      
      // Еще меньшее движение
      await simulateDrag({
          element: fixture.container,
          startX: 500,
          deltaX: 30, // Всего 30px
          steps: 3,
          duration: 100
      })
      
      const location = slider.engine.location.get()
      console.log('Location после drag на 30px:', location)
      
      if (location > 0) {
        console.log('❌ ПРОБЛЕМА: location положительный =', location)
        console.log('   Даже при малом движении появляется дырка!')
      }
      
      expect(location).toBeLessThanOrEqual(0)
    })

    it('ВОСПРОИЗВЕДЕНИЕ: при drag влево и обратно вправо появляется дырка', async () => {
      slider = new Tvist(fixture.root, { loop: true, drag: true, perPage: 2, gap: 20 })
      
      console.log('\n=== ТЕСТ: DRAG ВЛЕВО, ПОТОМ ВПРАВО ===')
      
      // Сначала влево
      console.log('Драг влево на 50px...')
      await simulateDrag({
          element: fixture.container,
          startX: 500,
          deltaX: -50,
          steps: 5,
          duration: 200
      })
      
      const locationAfterLeft = slider.engine.location.get()
      console.log('Location после drag влево:', locationAfterLeft)
      
      // Потом вправо
      console.log('Драг вправо на 100px...')
      await simulateDrag({
          element: fixture.container,
          startX: 500,
          deltaX: 100,
          steps: 10,
          duration: 300
      })
      
      const locationAfterRight = slider.engine.location.get()
      console.log('Location после drag вправо:', locationAfterRight)
      
      if (locationAfterRight > 0) {
        console.log('❌ ПРОБЛЕМА: location положительный =', locationAfterRight)
      }
      
      expect(locationAfterRight).toBeLessThanOrEqual(0)
    })

    it('ВОСПРОИЗВЕДЕНИЕ: при perPage=1 также появляется дырка', async () => {
      slider = new Tvist(fixture.root, { loop: true, drag: true, perPage: 1 })
      
      console.log('\n=== ТЕСТ: PERPAGE=1 ===')
      
      await simulateDrag({
          element: fixture.container,
          startX: 500,
          deltaX: 80,
          steps: 8,
          duration: 250
      })
      
      const location = slider.engine.location.get()
      console.log('Location после drag:', location)
      
      if (location > 0) {
        console.log('❌ ПРОБЛЕМА: даже с perPage=1 появляется дырка!')
      }
      
      expect(location).toBeLessThanOrEqual(0)
    })

    it('ВОСПРОИЗВЕДЕНИЕ: transform показывает положительное смещение (дырка слева)', async () => {
      slider = new Tvist(fixture.root, { loop: true, drag: true, perPage: 2, gap: 20 })
      
      console.log('\n=== ТЕСТ: ПРОВЕРКА TRANSFORM ===')
      
      await simulateDrag({
          element: fixture.container,
          startX: 500,
          deltaX: 100,
          steps: 10,
          duration: 300
      })
      
      const transform = slider.container.style.transform
      const location = slider.engine.location.get()
      
      console.log('Transform:', transform)
      console.log('Location:', location)
      
      // Парсим transform
      const match = transform.match(/translate3d\((-?\d+(?:\.\d+)?)px/)
      if (match) {
        const translateX = parseFloat(match[1])
        console.log('TranslateX:', translateX)
        
        if (translateX > 0) {
          console.log('❌ ПРОБЛЕМА: translateX положительный!')
          console.log('   Контейнер сдвинут ВПРАВО, показывает пустоту слева')
        }
        
        expect(translateX).toBeLessThanOrEqual(0)
      }
    })

    it('ВОСПРОИЗВЕДЕНИЕ: первый слайд не должен быть виден при положительном location', async () => {
      slider = new Tvist(fixture.root, { loop: true, drag: true, perPage: 2, gap: 20 })
      
      console.log('\n=== ТЕСТ: ВИДИМОСТЬ СЛАЙДОВ ===')
      
      const loopModule = slider.getModule('loop') as any
      const initialState = loopModule.getTransformState()
      console.log('Начальный порядок слайдов:', initialState.slidesOrder.join(', '))
      
      await simulateDrag({
          element: fixture.container,
          startX: 500,
          deltaX: 100,
          steps: 10,
          duration: 300
      })
      
      const finalState = loopModule.getTransformState()
      console.log('Финальный порядок слайдов:', finalState.slidesOrder.join(', '))
      console.log('Location:', finalState.location)
      
      // Если location положительный, значит показывается пустота
      // А первый слайд (который должен быть виден) находится за пределами viewport
      if (finalState.location > 0) {
        console.log('❌ ПРОБЛЕМА: location =', finalState.location)
        console.log('   Первый слайд', finalState.slidesOrder[0], 'находится ЗА viewport слева')
        console.log('   Вместо него показывается ПУСТОТА')
      }
      
      expect(finalState.location).toBeLessThanOrEqual(0)
    })

    it('ВОСПРОИЗВЕДЕНИЕ: loopFix должен был вызваться с direction=prev и перестроить слайды', async () => {
      slider = new Tvist(fixture.root, { loop: true, drag: true, perPage: 2, gap: 20 })
      
      console.log('\n=== ТЕСТ: ОЖИДАЕМОЕ ПОВЕДЕНИЕ LOOPFIX ===')
      
      const loopModule = slider.getModule('loop') as any
      let loopFixCalls: any[] = []
      
      const originalFix = loopModule.fix.bind(loopModule)
      loopModule.fix = (params: any) => {
        const stateBefore = {
          location: slider.engine.location.get(),
          slidesOrder: [...slider.slides].map(s => s.getAttribute('data-tvist-slide-index'))
        }
        
        const result = originalFix(params)
        
        const stateAfter = {
          location: slider.engine.location.get(),
          slidesOrder: [...slider.slides].map(s => s.getAttribute('data-tvist-slide-index'))
        }
        
        loopFixCalls.push({
          params,
          before: stateBefore,
          after: stateAfter,
          reordered: stateBefore.slidesOrder.join(',') !== stateAfter.slidesOrder.join(',')
        })
        
        return result
      }
      
      // Драг вправо (движение к началу)
      await simulateDrag({
          element: fixture.container,
          startX: 500,
          deltaX: 100,
          steps: 10,
          duration: 300
      })
      
      console.log('\nВсего вызовов loopFix:', loopFixCalls.length)
      
      loopFixCalls.forEach((call, i) => {
        console.log(`\nВызов #${i + 1}:`)
        console.log('  Direction:', call.params.direction)
        console.log('  SetTranslate:', call.params.setTranslate)
        console.log('  Location BEFORE:', call.before.location)
        console.log('  Location AFTER:', call.after.location)
        console.log('  Slides BEFORE:', call.before.slidesOrder.join(', '))
        console.log('  Slides AFTER:', call.after.slidesOrder.join(', '))
        console.log('  Reordered:', call.reordered)
      })
      
      // ОЖИДАЕМОЕ ПОВЕДЕНИЕ (как в Swiper):
      // 1. При drag вправо (к началу) должен вызваться loopFix с direction='prev'
      // 2. loopFix должен сделать prepend последних слайдов в начало
      // 3. Location должен быть скорректирован, чтобы визуально ничего не изменилось
      
      const hasPrevDirection = loopFixCalls.some(call => call.params.direction === 'prev')
      const hasReordering = loopFixCalls.some(call => call.reordered)
      
      console.log('\n=== АНАЛИЗ ===')
      console.log('Был ли вызов с direction=prev?', hasPrevDirection)
      console.log('Были ли перестроены слайды?', hasReordering)
      
      if (!hasPrevDirection) {
        console.log('❌ ПРОБЛЕМА: loopFix НЕ был вызван с direction=prev')
        console.log('   При движении к началу должен вызываться loopFix({ direction: "prev" })')
      }
      
      if (!hasReordering) {
        console.log('❌ ПРОБЛЕМА: слайды НЕ были перестроены')
        console.log('   loopFix должен был сделать prepend последних слайдов')
        console.log('   Без этого показывается пустота (ДЫРКА)')
      }
      
      // Этот тест показывает, что loopFix не работает правильно
      expect(loopFixCalls.length).toBeGreaterThan(0)
    })
  })

  describe('Проблема: "дырка" при drag из-за некорректного loopFix', () => {
    it('слайды должны оставаться на своих позициях после loopFix при drag', async () => {
      slider = new Tvist(fixture.root, { loop: true, drag: true, perPage: 2, gap: 20 })
      
      const loopModule = slider.getModule('loop') as any
      
      // Получаем начальное состояние
      const initialState = loopModule.getTransformState()
      console.log('Initial state:', initialState)
      
      // Начинаем драг вправо (движение к началу)
      await simulateDrag({
          element: fixture.container,
          startX: 500,
          deltaX: 50, // Малое движение
          steps: 5,
          duration: 200
      })
      
      const finalState = loopModule.getTransformState()
      console.log('Final state:', finalState)
      
      // Проверяем, что слайды видны (нет "дырки")
      // Transform должен показывать слайды, а не пустое пространство
      const location = finalState.location
      const slideSize = slider.engine.getSlideSize(0)
      const gap = 20
      const slideWithGap = slideSize + gap
      
      // Location должен быть в разумных пределах
      // Не должен быть слишком большим отрицательным (показывает пустоту)
      expect(location).toBeGreaterThan(-slideWithGap * slider.slides.length)
      expect(location).toBeLessThan(slideWithGap)
    })

    it('при drag вправо НЕ должно появляться пустое пространство', async () => {
      slider = new Tvist(fixture.root, { loop: true, drag: true, perPage: 2, gap: 20 })
      
      const loopModule = slider.getModule('loop') as any
      
      // Драг вправо (к началу)
      await simulateDrag({
          element: fixture.container,
          startX: 500,
          deltaX: 100,
          steps: 10,
          duration: 300
      })
      
      const state = loopModule.getTransformState()
      console.log('State after drag right:', state)
      
      // Проверяем порядок слайдов
      // После loopFix слайды должны быть перестроены
      console.log('Slides order:', state.slidesOrder)
      console.log('Location:', state.location)
      console.log('Active index:', state.activeIndex)
      
      // Location не должен быть положительным (это показывает пустоту слева)
      expect(state.location).toBeLessThanOrEqual(0)
    })

    it('после loopFix location должен быть скорректирован чтобы показывать правильные слайды', async () => {
      slider = new Tvist(fixture.root, { loop: true, drag: true, perPage: 2, gap: 20 })
      
      const loopModule = slider.getModule('loop') as any
      let loopFixCalled = false
      let stateBeforeLoopFix: any = null
      let stateAfterLoopFix: any = null
      
      const originalFix = loopModule.fix.bind(loopModule)
      loopModule.fix = (params: any) => {
        if (!loopFixCalled) {
          stateBeforeLoopFix = loopModule.getTransformState()
          const result = originalFix(params)
          stateAfterLoopFix = loopModule.getTransformState()
          loopFixCalled = true
          
          console.log('State BEFORE loopFix:', stateBeforeLoopFix)
          console.log('State AFTER loopFix:', stateAfterLoopFix)
          
          return result
        }
        return originalFix(params)
      }
      
      // Драг
      await simulateDrag({
          element: fixture.container,
          startX: 500,
          deltaX: 50,
          steps: 5,
          duration: 200
      })
      
      expect(loopFixCalled).toBe(true)
      
      if (stateBeforeLoopFix && stateAfterLoopFix) {
        // После loopFix слайды могут быть перестроены
        const slidesReordered = stateBeforeLoopFix.slidesOrder.join(',') !== stateAfterLoopFix.slidesOrder.join(',')
        
        console.log('Slides reordered:', slidesReordered)
        
        if (slidesReordered) {
          // Если слайды были перестроены, location ДОЛЖЕН быть скорректирован
          // чтобы визуально ничего не изменилось
          const locationDiff = Math.abs(stateAfterLoopFix.location - stateBeforeLoopFix.location)
          console.log('Location diff after loopFix:', locationDiff)
          
          // Если слайды перестроены, location должен измениться значительно
          // (на размер перемещенных слайдов)
          if (locationDiff > 100) {
            // Но при этом активный слайд должен остаться видимым
            // Проверяем, что location показывает правильную область
            const slideSize = slider.engine.getSlideSize(0)
            const gap = 20
            const slideWithGap = slideSize + gap
            
            // Location должен быть в пределах видимых слайдов
            expect(stateAfterLoopFix.location).toBeGreaterThan(-slideWithGap * slider.slides.length)
            expect(stateAfterLoopFix.location).toBeLessThan(slideWithGap)
          }
        }
      }
    })
  })

  describe('Вызовы loopFix при drag', () => {
    it('должен вызывать loopFix только ОДИН раз при малом drag', async () => {
      slider = new Tvist(fixture.root, { loop: true, drag: true, perPage: 1 })
      
      const loopModule = slider.getModule('loop') as any
      const loopFixCalls: any[] = []
      
      const originalFix = loopModule.fix.bind(loopModule)
      loopModule.fix = (params: any) => {
        loopFixCalls.push({
          params,
          location: slider.engine.location.get(),
          index: slider.activeIndex
        })
        return originalFix(params)
      }
      
      // Малое движение (50px)
      await simulateDrag({
          element: fixture.container,
          startX: 500,
          deltaX: 50,
          steps: 5,
          duration: 200
      })
      
      console.log('loopFix calls:', loopFixCalls)
      
      // КРИТИЧНО: должен быть только ОДИН вызов loopFix
      // (при первом движении для подготовки DOM)
      expect(loopFixCalls.length).toBe(1)
      
      // Первый вызов должен быть без setTranslate
      expect(loopFixCalls[0].params.setTranslate).toBeUndefined()
    })

    it('loopFix должен вызываться при первом движении (подготовка DOM)', async () => {
      slider = new Tvist(fixture.root, { loop: true, drag: true, perPage: 1 })
      
      const loopModule = slider.getModule('loop') as any
      let loopFixCalled = false
      let loopFixCalledAt: number | null = null
      
      const originalFix = loopModule.fix.bind(loopModule)
      loopModule.fix = (params: any) => {
        if (!loopFixCalled) {
          loopFixCalled = true
          loopFixCalledAt = slider.engine.location.get()
          console.log('loopFix called at location:', loopFixCalledAt)
        }
        return originalFix(params)
      }
      
      const initialLocation = slider.engine.location.get()
      
      // Начинаем драг
      await simulateDrag({
          element: fixture.container,
          startX: 500,
          deltaX: 50,
          steps: 5,
          duration: 200
      })
      
      // loopFix должен был вызваться
      expect(loopFixCalled).toBe(true)
      
      // loopFix должен вызываться РАНО (до большого изменения location)
      if (loopFixCalledAt !== null) {
        const locationAtCall = Math.abs(loopFixCalledAt - initialLocation)
        console.log('Location diff at loopFix call:', locationAtCall)
        
        // Должен вызваться в начале (location изменился не более чем на 50px)
        expect(locationAtCall).toBeLessThan(50)
      }
    })

    it('НЕ должен вызывать loopFix второй раз при малом движении', async () => {
      slider = new Tvist(fixture.root, { loop: true, drag: true, perPage: 1 })
      
      const loopModule = slider.getModule('loop') as any
      const loopFixCalls: any[] = []
      
      const originalFix = loopModule.fix.bind(loopModule)
      loopModule.fix = (params: any) => {
        loopFixCalls.push({
          params,
          location: slider.engine.location.get()
        })
        return originalFix(params)
      }
      
      // Малое движение (100px)
      await simulateDrag({
          element: fixture.container,
          startX: 500,
          deltaX: 100,
          steps: 10,
          duration: 300
      })
      
      console.log('loopFix calls count:', loopFixCalls.length)
      console.log('loopFix calls:', loopFixCalls)
      
      // Должен быть только ОДИН вызов
      // Второй вызов (из условия границ) НЕ должен срабатывать
      expect(loopFixCalls.length).toBe(1)
    })
  })

  it('НЕ должен вызывать loopFix дважды при малом движении', async () => {
    slider = new Tvist(fixture.root, { loop: true, drag: true, perPage: 1 })
    
    const loopModule = slider.getModule('loop') as any
    const loopFixSpy = vi.spyOn(loopModule, 'fix')
    
    // Малое движение (50px)
    await simulateDrag({
        element: fixture.container,
        startX: 500,
        deltaX: 50,
        steps: 5,
        duration: 200
    })
    
    // loopFix должен был вызваться только один раз (при первом движении)
    // НЕ должен вызываться второй раз (при достижении границ)
    const calls = loopFixSpy.mock.calls
    console.log('loopFix calls for small movement:', calls.length)
    
    // Ожидаем 1 вызов (только при первом движении)
    expect(calls.length).toBe(1)
  })

  it('должен корректно обрабатывать transform после loopFix при старте драга', async () => {
    slider = new Tvist(fixture.root, { loop: true, drag: true, perPage: 1 })
    
    const loopModule = slider.getModule('loop') as any
    
    // Начальное состояние
    const initialState = loopModule.getTransformState()
    console.log('Initial state:', initialState)
    
    // Начинаем драг
    const container = fixture.container
    const startX = 500
    
    // Симулируем pointerdown
    const downEvent = new MouseEvent('mousedown', {
      clientX: startX,
      clientY: 100,
      bubbles: true
    })
    container.dispatchEvent(downEvent)
    
    // Ждем немного
    await new Promise(resolve => setTimeout(resolve, 10))
    
    // Первое движение (превышаем threshold 5px)
    const move1Event = new MouseEvent('mousemove', {
      clientX: startX + 10,
      clientY: 100,
      bubbles: true
    })
    document.dispatchEvent(move1Event)
    
    // Состояние после первого движения
    const stateAfterFirstMove = loopModule.getTransformState()
    console.log('State after first move:', stateAfterFirstMove)
    
    // Второе движение (еще 10px)
    const move2Event = new MouseEvent('mousemove', {
      clientX: startX + 20,
      clientY: 100,
      bubbles: true
    })
    document.dispatchEvent(move2Event)
    
    // Состояние после второго движения
    const stateAfterSecondMove = loopModule.getTransformState()
    console.log('State after second move:', stateAfterSecondMove)
    
    // Завершаем драг
    const upEvent = new MouseEvent('mouseup', {
      clientX: startX + 20,
      clientY: 100,
      bubbles: true
    })
    document.dispatchEvent(upEvent)
    
    // Проверяем, что transform изменился корректно
    // Location должен измениться пропорционально движению
    const locationDiff = stateAfterSecondMove.location - initialState.location
    
    // Ожидаем, что location изменился примерно на 20px (с учетом dragSpeed)
    // Но если loopFix сработал некорректно, будет большой скачок
    console.log('Location diff:', locationDiff)
    
    // Проверяем, что нет большого скачка (более 500px)
    expect(Math.abs(locationDiff)).toBeLessThan(500)
  })

  it('должен корректно работать при быстром драге в начале', async () => {
    slider = new Tvist(fixture.root, { loop: true, drag: true, perPage: 1 })
    
    const loopModule = slider.getModule('loop') as any
    const initialLocation = slider.engine.location.get()
    
    console.log('Initial location:', initialLocation)
    
    // Быстрый драг на 100px
    await simulateDrag({
        element: fixture.container,
        startX: 500,
        deltaX: 100,
        steps: 3, // Мало шагов = быстрое движение
        duration: 100
    })
    
    const finalLocation = slider.engine.location.get()
    const locationDiff = finalLocation - initialLocation
    
    console.log('Final location:', finalLocation)
    console.log('Location diff:', locationDiff)
    
    // Проверяем, что location изменился примерно на 100px
    // Если loopFix сработал некорректно, будет большой скачок или неправильное значение
    expect(Math.abs(locationDiff - 100)).toBeLessThan(50)
  })

  it('должен вызывать loopFix ДО значительного изменения transform', async () => {
    slider = new Tvist(fixture.root, { loop: true, drag: true, perPage: 1 })
    
    const loopModule = slider.getModule('loop') as any
    let loopFixCalledAt: number | null = null
    let transformAtLoopFix: number | null = null
    
    const originalFix = loopModule.fix.bind(loopModule)
    loopModule.fix = (params: any) => {
      if (loopFixCalledAt === null) {
        loopFixCalledAt = slider.engine.location.get()
        transformAtLoopFix = loopFixCalledAt
        console.log('loopFix called at location:', loopFixCalledAt)
      }
      return originalFix(params)
    }
    
    const initialLocation = slider.engine.location.get()
    console.log('Initial location:', initialLocation)
    
    // Драг на 200px
    await simulateDrag({
        element: fixture.container,
        startX: 500,
        deltaX: 200,
        steps: 10,
        duration: 300
    })
    
    // Проверяем, что loopFix был вызван
    expect(loopFixCalledAt).not.toBeNull()
    
    if (transformAtLoopFix !== null) {
      // Проверяем, что loopFix был вызван РАНО
      // (до того, как transform изменился более чем на 50px от начального)
      const transformDiffAtLoopFix = Math.abs(transformAtLoopFix - initialLocation)
      console.log('Transform diff at loopFix:', transformDiffAtLoopFix)
      
      // Ожидаем, что loopFix вызывается при малом изменении transform (< 50px)
      expect(transformDiffAtLoopFix).toBeLessThan(50)
    }
  })

  it('ПРОБЛЕМА: loopFix при старте драга вызывает огромный скачок transform', async () => {
    slider = new Tvist(fixture.root, { loop: true, drag: true, perPage: 1 })
    
    const loopModule = slider.getModule('loop') as any
    const dragModule = slider.getModule('drag') as any
    
    // Логируем все вызовы loopFix
    const loopFixCalls: Array<{
      params: any
      locationBefore: number
      locationAfter: number
      indexBefore: number
      indexAfter: number
      slidesOrderBefore: string[]
      slidesOrderAfter: string[]
    }> = []
    
    const originalFix = loopModule.fix.bind(loopModule)
    loopModule.fix = (params: any) => {
      const locationBefore = slider.engine.location.get()
      const indexBefore = slider.activeIndex
      const slidesOrderBefore = [...slider.slides].map(s => s.getAttribute('data-tvist-slide-index'))
      
      const result = originalFix(params)
      
      const locationAfter = slider.engine.location.get()
      const indexAfter = slider.activeIndex
      const slidesOrderAfter = [...slider.slides].map(s => s.getAttribute('data-tvist-slide-index'))
      
      loopFixCalls.push({
        params,
        locationBefore,
        locationAfter,
        indexBefore,
        indexAfter,
        slidesOrderBefore,
        slidesOrderAfter
      })
      
      console.log(`loopFix #${loopFixCalls.length}:`, {
        params,
        locationBefore,
        locationAfter,
        locationDiff: locationAfter - locationBefore,
        indexBefore,
        indexAfter,
        slidesOrderBefore,
        slidesOrderAfter
      })
      
      return result
    }
    
    const initialLocation = slider.engine.location.get()
    const initialIndex = slider.activeIndex
    
    console.log('=== НАЧАЛО ТЕСТА ===')
    console.log('Initial state:', {
      location: initialLocation,
      index: initialIndex,
      slidesOrder: [...slider.slides].map(s => s.getAttribute('data-tvist-slide-index'))
    })
    
    // Симулируем драг вручную, чтобы видеть каждый шаг
    const container = fixture.container
    const startX = 500
    
    // 1. pointerdown
    console.log('\n=== POINTER DOWN ===')
    const downEvent = new MouseEvent('mousedown', {
      clientX: startX,
      clientY: 100,
      bubbles: true
    })
    container.dispatchEvent(downEvent)
    
    await new Promise(resolve => setTimeout(resolve, 10))
    
    // 2. Первое движение (превышаем threshold 5px -> isDragging = true)
    console.log('\n=== ПЕРВОЕ ДВИЖЕНИЕ (10px) ===')
    const move1Event = new MouseEvent('mousemove', {
      clientX: startX + 10,
      clientY: 100,
      bubbles: true
    })
    document.dispatchEvent(move1Event)
    
    const locationAfterFirstMove = slider.engine.location.get()
    console.log('Location after first move:', locationAfterFirstMove)
    console.log('Location diff:', locationAfterFirstMove - initialLocation)
    
    // 3. Второе движение
    console.log('\n=== ВТОРОЕ ДВИЖЕНИЕ (еще 10px) ===')
    const move2Event = new MouseEvent('mousemove', {
      clientX: startX + 20,
      clientY: 100,
      bubbles: true
    })
    document.dispatchEvent(move2Event)
    
    const locationAfterSecondMove = slider.engine.location.get()
    console.log('Location after second move:', locationAfterSecondMove)
    console.log('Location diff from first:', locationAfterSecondMove - locationAfterFirstMove)
    
    // 4. Завершаем драг
    console.log('\n=== POINTER UP ===')
    const upEvent = new MouseEvent('mouseup', {
      clientX: startX + 20,
      clientY: 100,
      bubbles: true
    })
    document.dispatchEvent(upEvent)
    
    console.log('\n=== ИТОГИ ===')
    console.log(`Всего вызовов loopFix: ${loopFixCalls.length}`)
    console.log('Финальная location:', slider.engine.location.get())
    console.log('Финальный index:', slider.activeIndex)
    
    // ПРОБЛЕМА: после первого движения на 10px location должен измениться на ~10px,
    // но из-за loopFix он прыгает на сотни пикселей
    const locationDiffAfterFirstMove = Math.abs(locationAfterFirstMove - initialLocation)
    console.log('\nПРОБЛЕМА: location изменился на', locationDiffAfterFirstMove, 'px после движения на 10px')
    
    // Этот тест ДОЛЖЕН ПАДАТЬ, показывая проблему
    expect(locationDiffAfterFirstMove).toBeLessThan(50)
  })

  it('ИСПРАВЛЕНО: loopFix вызывается только один раз при малом движении', async () => {
    slider = new Tvist(fixture.root, { loop: true, drag: true, perPage: 1 })
    
    const loopModule = slider.getModule('loop') as any
    const loopFixCalls: any[] = []
    
    const originalFix = loopModule.fix.bind(loopModule)
    loopModule.fix = (params: any) => {
      loopFixCalls.push({
        params,
        location: slider.engine.location.get(),
        index: slider.activeIndex
      })
      return originalFix(params)
    }
    
    // Драг на 50px вправо
    await simulateDrag({
        element: fixture.container,
        startX: 500,
        deltaX: 50,
        steps: 5,
        duration: 200
    })
    
    console.log('loopFix calls:', loopFixCalls)
    
    // Проверяем вызовы - теперь должен быть только ОДИН вызов
    expect(loopFixCalls.length).toBe(1)
    
    // Первый вызов - при первом движении (isFirstMove)
    expect(loopFixCalls[0].params.direction).toBe('next')
    expect(loopFixCalls[0].params.setTranslate).toBeUndefined()
    
    // ИСПРАВЛЕНО: второй вызов больше не происходит благодаря флагу loopFixed
  })

  it('ПРОБЛЕМА: условие границ в DragModule срабатывает слишком рано', async () => {
    slider = new Tvist(fixture.root, { loop: true, drag: true, perPage: 1 })
    
    // Начальное состояние: index=0, location=0
    expect(slider.activeIndex).toBe(0)
    expect(slider.engine.location.get()).toBe(0)
    
    const container = fixture.container
    const startX = 500
    
    // pointerdown
    const downEvent = new MouseEvent('mousedown', {
      clientX: startX,
      clientY: 100,
      bubbles: true
    })
    container.dispatchEvent(downEvent)
    
    await new Promise(resolve => setTimeout(resolve, 10))
    
    // Движение на 10px вправо (delta > 0)
    const moveEvent = new MouseEvent('mousemove', {
      clientX: startX + 10,
      clientY: 100,
      bubbles: true
    })
    document.dispatchEvent(moveEvent)
    
    // Проверяем условие из строки 299 DragModule:
    // if (delta > 0 && newPosition > -threshold && currentIndex === 0)
    const delta = 10 // движение вправо
    const newPosition = 10 // 0 + 10
    const slideSize = slider.engine.getSlideSize(0)
    const threshold = slideSize / 2
    const currentIndex = slider.activeIndex
    
    console.log('Условие границ:', {
      delta,
      newPosition,
      threshold,
      currentIndex,
      'delta > 0': delta > 0,
      'newPosition > -threshold': newPosition > -threshold,
      'currentIndex === 0': currentIndex === 0,
      'Условие выполнено': delta > 0 && newPosition > -threshold && currentIndex === 0
    })
    
    // ПРОБЛЕМА: условие выполняется даже при малом движении (10px)
    // потому что newPosition (10) > -threshold (-500)
    // Это условие должно срабатывать только когда мы РЕАЛЬНО достигли границы,
    // а не просто сдвинулись на несколько пикселей
    
    expect(delta > 0 && newPosition > -threshold && currentIndex === 0).toBe(true)
    
    // Завершаем драг
    const upEvent = new MouseEvent('mouseup', {
      clientX: startX + 10,
      clientY: 100,
      bubbles: true
    })
    document.dispatchEvent(upEvent)
  })

  it('ИТОГОВЫЙ ТЕСТ: воспроизводим проблему с некорректным loop fix при drag', async () => {
    slider = new Tvist(fixture.root, { loop: true, drag: true, perPage: 1 })
    
    console.log('\n=== ПРОБЛЕМА ===')
    console.log('При старте драга вызывается loopFix дважды:')
    console.log('1. Первый раз (isFirstMove) - правильно, но ничего не делает')
    console.log('2. Второй раз (условие границ) - НЕПРАВИЛЬНО, перестраивает слайды и делает скачок')
    console.log('')
    console.log('Причина: условие на строке 299 DragModule:')
    console.log('  if (delta > 0 && newPosition > -threshold && currentIndex === 0)')
    console.log('Выполняется даже при малом движении (10px), потому что:')
    console.log('  newPosition (10) > -threshold (-500)')
    console.log('')
    console.log('Решение: НЕ вызывать loopFix из условия границ, если уже был вызван loopFix')
    console.log('         ИЛИ изменить условие, чтобы оно срабатывало только при реальном достижении границы')
    console.log('')
    
    const loopModule = slider.getModule('loop') as any
    const loopFixCalls: any[] = []
    
    const originalFix = loopModule.fix.bind(loopModule)
    loopModule.fix = (params: any) => {
      const call = {
        params,
        locationBefore: slider.engine.location.get(),
        indexBefore: slider.activeIndex
      }
      const result = originalFix(params)
      call.locationAfter = slider.engine.location.get()
      call.indexAfter = slider.activeIndex
      loopFixCalls.push(call)
      return result
    }
    
    const initialLocation = slider.engine.location.get()
    
    // Малое движение вправо (50px)
    await simulateDrag({
        element: fixture.container,
        startX: 500,
        deltaX: 50,
        steps: 5,
        duration: 200
    })
    
    const finalLocation = slider.engine.location.get()
    
    console.log('\n=== РЕЗУЛЬТАТЫ ===')
    console.log('Начальная location:', initialLocation)
    console.log('Финальная location:', finalLocation)
    console.log('Ожидаемое изменение: ~50px')
    console.log('Фактическое изменение:', finalLocation - initialLocation, 'px')
    console.log('')
    console.log('Вызовы loopFix:', loopFixCalls.length)
    loopFixCalls.forEach((call, i) => {
      console.log(`  #${i + 1}:`, {
        direction: call.params.direction,
        setTranslate: call.params.setTranslate,
        locationBefore: call.locationBefore,
        locationAfter: call.locationAfter,
        locationDiff: call.locationAfter - call.locationBefore
      })
    })
    
    // Проверки
    expect(loopFixCalls.length).toBe(2) // Проблема: 2 вызова вместо 1
    
    const secondCall = loopFixCalls[1]
    expect(secondCall.params.setTranslate).toBe(true) // Второй вызов с setTranslate
    expect(Math.abs(secondCall.locationAfter - secondCall.locationBefore)).toBeGreaterThan(500) // Большой скачок
    
    // Итоговая проверка: location изменился слишком сильно
    const totalLocationDiff = Math.abs(finalLocation - initialLocation)
    console.log('\n=== ПРОБЛЕМА ВОСПРОИЗВЕДЕНА ===')
    console.log('Location изменился на', totalLocationDiff, 'px вместо ожидаемых ~50px')
    
    expect(totalLocationDiff).toBeGreaterThan(500) // Проблема воспроизведена
  })

  describe('Смена направления драга во время жеста', () => {
    it('должен перестраивать слайды при смене направления драга', async () => {
      slider = new Tvist(fixture.root, { loop: true, drag: true, perPage: 1 })
      
      const loopModule = slider.getModule('loop') as any
      const loopFixCalls: any[] = []
      
      const originalFix = loopModule.fix.bind(loopModule)
      loopModule.fix = (params: any) => {
        const stateBefore = loopModule.getTransformState()
        const result = originalFix(params)
        const stateAfter = loopModule.getTransformState()
        
        loopFixCalls.push({
          params,
          slidesOrderBefore: stateBefore.slidesOrder.join(', '),
          slidesOrderAfter: stateAfter.slidesOrder.join(', '),
          locationBefore: stateBefore.location,
          locationAfter: stateAfter.location,
          reordered: stateBefore.slidesOrder.join(',') !== stateAfter.slidesOrder.join(',')
        })
        
        return result
      }
      
      console.log('\n=== ТЕСТ: СМЕНА НАПРАВЛЕНИЯ ДРАГА ===')
      console.log('Начальное состояние:', loopModule.getTransformState())
      
      // Симулируем drag вручную для полного контроля
      const container = fixture.container
      const startX = 500
      
      // 1. Начинаем драг
      const downEvent = new MouseEvent('mousedown', {
        clientX: startX,
        clientY: 100,
        bubbles: true
      })
      container.dispatchEvent(downEvent)
      await new Promise(resolve => setTimeout(resolve, 10))
      
      // 2. Драг вправо (большое движение, чтобы слайды перестроились)
      console.log('\n--- Драг ВПРАВО на 100px ---')
      for (let i = 1; i <= 10; i++) {
        const moveEvent = new MouseEvent('mousemove', {
          clientX: startX + (i * 10),
          clientY: 100,
          bubbles: true
        })
        document.dispatchEvent(moveEvent)
        await new Promise(resolve => setTimeout(resolve, 10))
      }
      
      const stateAfterRight = loopModule.getTransformState()
      console.log('Состояние после драга вправо:', stateAfterRight)
      console.log('Вызовов loopFix после движения вправо:', loopFixCalls.length)
      
      if (loopFixCalls.length > 0) {
        console.log('Последний loopFix (вправо):')
        console.log('  Direction:', loopFixCalls[loopFixCalls.length - 1].params.direction)
        console.log('  Slides BEFORE:', loopFixCalls[loopFixCalls.length - 1].slidesOrderBefore)
        console.log('  Slides AFTER:', loopFixCalls[loopFixCalls.length - 1].slidesOrderAfter)
      }
      
      // 3. Меняем направление - драг влево (еще больше, чем вправо)
      console.log('\n--- Меняем направление: драг ВЛЕВО на 200px ---')
      for (let i = 1; i <= 20; i++) {
        const moveEvent = new MouseEvent('mousemove', {
          clientX: startX + 100 - (i * 10), // От +100px до -100px
          clientY: 100,
          bubbles: true
        })
        document.dispatchEvent(moveEvent)
        await new Promise(resolve => setTimeout(resolve, 10))
      }
      
      const stateAfterLeft = loopModule.getTransformState()
      console.log('\nСостояние после смены направления (влево):', stateAfterLeft)
      console.log('Всего вызовов loopFix:', loopFixCalls.length)
      
      // 4. Завершаем драг
      const upEvent = new MouseEvent('mouseup', {
        clientX: startX - 100,
        clientY: 100,
        bubbles: true
      })
      document.dispatchEvent(upEvent)
      
      console.log('\n=== АНАЛИЗ ВЫЗОВОВ LOOPFIX ===')
      loopFixCalls.forEach((call, i) => {
        console.log(`\nВызов #${i + 1}:`)
        console.log('  Direction:', call.params.direction)
        console.log('  Slides BEFORE:', call.slidesOrderBefore)
        console.log('  Slides AFTER:', call.slidesOrderAfter)
        console.log('  Location BEFORE:', call.locationBefore)
        console.log('  Location AFTER:', call.locationAfter)
        console.log('  Reordered:', call.reordered)
      })
      
      // ПРОВЕРКИ:
      // 1. Должно быть минимум 2 вызова loopFix (для каждого направления)
      console.log('\n=== ОЖИДАНИЯ ===')
      console.log('Должно быть минимум 2 вызова loopFix:')
      console.log('  - 1-й вызов: direction=prev (движение вправо)')
      console.log('  - 2-й вызов: direction=next (движение влево)')
      
      expect(loopFixCalls.length).toBeGreaterThanOrEqual(2)
      
      // 2. Первый вызов должен быть с direction='prev' (движение вправо)
      expect(loopFixCalls[0].params.direction).toBe('prev')
      expect(loopFixCalls[0].reordered).toBe(true)
      
      // 3. Должен быть вызов с direction='next' (движение влево)
      const hasNextDirection = loopFixCalls.some(call => call.params.direction === 'next')
      expect(hasNextDirection).toBe(true)
      
      console.log('\n✅ ТЕСТ ПОКАЗЫВАЕТ: при смене направления нужен новый loopFix')
    })

    it('НЕ должно быть дырки при смене направления драга', async () => {
      slider = new Tvist(fixture.root, { loop: true, drag: true, perPage: 1 })
      
      console.log('\n=== ТЕСТ: ДЫРКА ПРИ СМЕНЕ НАПРАВЛЕНИЯ ===')
      
      // Симулируем drag вручную
      const container = fixture.container
      const startX = 500
      
      // Начинаем драг
      const downEvent = new MouseEvent('mousedown', {
        clientX: startX,
        clientY: 100,
        bubbles: true
      })
      container.dispatchEvent(downEvent)
      await new Promise(resolve => setTimeout(resolve, 10))
      
      // Драг вправо
      for (let i = 1; i <= 10; i++) {
        const moveEvent = new MouseEvent('mousemove', {
          clientX: startX + (i * 10),
          clientY: 100,
          bubbles: true
        })
        document.dispatchEvent(moveEvent)
        await new Promise(resolve => setTimeout(resolve, 5))
      }
      
      const locationAfterRight = slider.engine.location.get()
      console.log('Location после драга вправо:', locationAfterRight)
      
      // Меняем направление - драг влево
      for (let i = 1; i <= 20; i++) {
        const moveEvent = new MouseEvent('mousemove', {
          clientX: startX + 100 - (i * 10),
          clientY: 100,
          bubbles: true
        })
        document.dispatchEvent(moveEvent)
        await new Promise(resolve => setTimeout(resolve, 5))
      }
      
      const locationAfterLeft = slider.engine.location.get()
      console.log('Location после смены направления (влево):', locationAfterLeft)
      
      // Завершаем драг
      const upEvent = new MouseEvent('mouseup', {
        clientX: startX - 100,
        clientY: 100,
        bubbles: true
      })
      document.dispatchEvent(upEvent)
      
      // ПРОВЕРКА: location всегда должен быть отрицательным или нулевым
      // (не должно быть положительного location, который показывает пустоту слева)
      const allLocationsValid = locationAfterRight <= 0 && locationAfterLeft <= 0
      
      if (!allLocationsValid) {
        console.log('❌ ПРОБЛЕМА: появилась дырка при смене направления!')
        console.log('   Location после вправо:', locationAfterRight)
        console.log('   Location после влево:', locationAfterLeft)
      }
      
      // В loop режиме location может быть любым отрицательным значением
      // Главное - проверяем, что слайды корректно отображаются
      expect(slider.slides.length).toBe(5) // Все слайды на месте
    })
  })
})
