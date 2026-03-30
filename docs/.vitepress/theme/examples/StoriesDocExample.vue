<template>
  <ExampleCard title="Stories" description="Вложенные слайдеры групп и историй с сегментным прогрессом">
    <div class="stories-demo">
      <div class="stories-groups-nav">
        <button
          v-for="(group, index) in groups"
          :key="group.id"
          class="stories-group-chip"
          :class="{ 'stories-group-chip--active': index === activeGroupIndex }"
          type="button"
          @click="goToGroup(index)"
        >
          <span class="stories-group-chip__author">{{ group.author }}</span>
          <span class="stories-group-chip__count">{{ group.stories.length }}</span>
        </button>
      </div>

      <div class="stories-shell">
        <div class="stories-progress">
          <div
            v-for="(item, index) in groups[activeGroupIndex]?.stories ?? []"
            :key="item.id"
            class="stories-progress__segment"
          >
            <div
              class="stories-progress__fill"
              :class="{ 'stories-progress__fill--animated': shouldAnimateSegment(index) }"
              :style="{ width: getSegmentWidth(index) }"
              :key="`${item.id}-${progressRenderKey}`"
            ></div>
          </div>
        </div>

        <div ref="groupRootEl" class="tvist-v1 stories-groups">
          <div class="tvist-v1__container">
            <div v-for="(group, groupIndex) in groups" :key="group.id" class="tvist-v1__slide stories-group-slide">
              <div class="stories-inner-wrap">
                <div :ref="(el) => setInnerRootRef(el, groupIndex)" class="tvist-v1 stories-inner">
                  <div class="tvist-v1__container">
                    <div
                      v-for="story in group.stories"
                      :key="story.id"
                      class="tvist-v1__slide stories-inner-slide"
                      :style="{ background: story.background }"
                    >
                      <div class="stories-meta">
                        <div class="stories-author">{{ group.author }}</div>
                        <div class="stories-title">{{ story.title }}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          class="stories-tap stories-tap--prev"
          @pointerdown="onTapPointerDown('prev', $event)"
          @pointerup="onTapPointerUp('prev', $event)"
          @pointercancel="onTapPointerCancel"
        ></div>
        <div
          class="stories-tap stories-tap--next"
          @pointerdown="onTapPointerDown('next', $event)"
          @pointerup="onTapPointerUp('next', $event)"
          @pointercancel="onTapPointerCancel"
        ></div>
      </div>

      <p class="stories-caption">
        Desktop: группы переключаются без анимации. Mobile: группы через cube-эффект.
      </p>
    </div>
  </ExampleCard>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { Tvist } from 'tvist'
import ExampleCard from '../ExampleCard.vue'

const groups = [
  {
    id: 'group-1',
    author: 'Маша',
    stories: [
      { id: '1-1', title: 'Утро у моря', background: 'linear-gradient(140deg, #1f2937 0%, #374151 60%, #6b7280 100%)' },
      { id: '1-2', title: 'Кофе-брейк', background: 'linear-gradient(140deg, #334155 0%, #1e293b 55%, #0f172a 100%)' },
      { id: '1-3', title: 'Рабочий спринт', background: 'linear-gradient(150deg, #0f172a 0%, #1d4ed8 60%, #60a5fa 100%)' },
    ],
  },
  {
    id: 'group-2',
    author: 'Саша',
    stories: [
      { id: '2-1', title: 'Скейт-парк', background: 'linear-gradient(135deg, #3f3f46 0%, #52525b 45%, #27272a 100%)' },
      { id: '2-2', title: 'Город вечером', background: 'linear-gradient(150deg, #0f172a 0%, #7c3aed 55%, #a855f7 100%)' }
    ],
  },
  {
    id: 'group-3',
    author: 'Ира',
    stories: [
      { id: '3-1', title: 'Горы', background: 'linear-gradient(140deg, #1e3a8a 0%, #1d4ed8 50%, #38bdf8 100%)' },
      { id: '3-2', title: 'Треккинг', background: 'linear-gradient(140deg, #14532d 0%, #166534 60%, #4ade80 100%)' },
      { id: '3-3', title: 'Закат', background: 'linear-gradient(145deg, #7f1d1d 0%, #b91c1c 50%, #f97316 100%)' },
    ],
  },
]

const groupRootEl = ref(null)
const groupSlider = ref(null)
const innerRootEls = ref([])
const innerSliders = ref([])

const activeGroupIndex = ref(0)
const activeStoryIndex = ref(0)
const activeStoryProgress = ref(0)
const animateActiveSegment = ref(false)
const storiesEnded = ref(false)
const progressRenderKey = ref(0)

const tapPointerId = ref(null)
const tapStartedAt = ref(0)
const TAP_MAX_DURATION = 220

const STORY_AUTOPLAY = {
  delay: 2800,
  pauseOnHover: false,
  waitForVideo: false,
}

const setInnerRootRef = (el, index) => {
  innerRootEls.value[index] = el ?? null
}

const isMobile = () => window.matchMedia('(max-width: 767px)').matches

const getGroupSliderOptions = () => {
  if (isMobile()) {
    return {
      effect: 'cube',
      speed: 540,
      cubeEffect: {
        slideShadows: true,
        shadow: true,
        shadowOffset: 12,
        shadowScale: 0.94,
      },
    }
  }

  return {
    effect: 'slide',
    speed: 0,
    cubeEffect: undefined,
  }
}

const applyGroupMode = () => {
  if (!groupSlider.value) return
  groupSlider.value.updateOptions(getGroupSliderOptions())
}

const syncAutoplayForActiveGroup = () => {
  innerSliders.value.forEach((slider, index) => {
    if (!slider) return
    if (storiesEnded.value) {
      slider.updateOptions({ autoplay: false })
      return
    }

    slider.updateOptions({
      autoplay: index === activeGroupIndex.value ? STORY_AUTOPLAY : false,
    })
  })
}

const activateGroup = (index) => {
  storiesEnded.value = false
  animateActiveSegment.value = false
  activeGroupIndex.value = index
  const slider = innerSliders.value[index]
  if (!slider) return

  activeStoryIndex.value = slider.realIndex ?? slider.activeIndex ?? 0
  activeStoryProgress.value = 0
  progressRenderKey.value += 1
  syncAutoplayForActiveGroup()
}

const handleInnerReachEnd = (groupIndex) => {
  if (!groupSlider.value) return
  if (groupIndex >= groups.length - 1) {
    storiesEnded.value = true
    animateActiveSegment.value = false
    activeStoryIndex.value = groups[groupIndex].stories.length - 1
    activeStoryProgress.value = 1
    innerSliders.value[groupIndex]?.autoplay?.stop()
    return
  }

  groupSlider.value.scrollTo(groupIndex + 1, true)
}

const handlePrev = () => {
  storiesEnded.value = false
  animateActiveSegment.value = false
  const slider = innerSliders.value[activeGroupIndex.value]
  if (!slider) return
  const currentIndex = slider.realIndex ?? slider.activeIndex ?? 0
  if (currentIndex > 0) {
    activeStoryIndex.value = currentIndex - 1
    activeStoryProgress.value = 0
    progressRenderKey.value += 1
    slider.prev()
    return
  }

  if (activeGroupIndex.value > 0) {
    groupSlider.value?.scrollTo(activeGroupIndex.value - 1, true)
  }
}

const handleNext = () => {
  storiesEnded.value = false
  animateActiveSegment.value = false
  const slider = innerSliders.value[activeGroupIndex.value]
  const activeGroup = groups[activeGroupIndex.value]
  if (!slider) return
  const currentIndex = slider.realIndex ?? slider.activeIndex ?? 0
  if (activeGroup && currentIndex < activeGroup.stories.length - 1) {
    activeStoryIndex.value = currentIndex + 1
    activeStoryProgress.value = 0
    progressRenderKey.value += 1
    slider.next()
    return
  }

  if (activeGroupIndex.value < groups.length - 1) {
    groupSlider.value?.scrollTo(activeGroupIndex.value + 1, true)
  }
}

const goToGroup = (index) => {
  if (!groupSlider.value) return
  if (index === activeGroupIndex.value) return
  animateActiveSegment.value = false
  storiesEnded.value = false
  groupSlider.value.scrollTo(index, true)
}

const onTapPointerDown = (_, event) => {
  if (!event.isPrimary) return
  tapPointerId.value = event.pointerId
  tapStartedAt.value = performance.now()
}

const onTapPointerUp = (direction, event) => {
  if (!event.isPrimary) return
  if (tapPointerId.value !== event.pointerId) return
  const duration = performance.now() - tapStartedAt.value
  tapPointerId.value = null
  tapStartedAt.value = 0

  // Долгое удержание отдаём holdToPause, не трактуем как tap-навигацию.
  if (duration > TAP_MAX_DURATION) return

  if (direction === 'prev') {
    handlePrev()
  } else {
    handleNext()
  }
}

const onTapPointerCancel = () => {
  tapPointerId.value = null
  tapStartedAt.value = 0
}

const shouldAnimateSegment = (segmentIndex) => {
  return animateActiveSegment.value && segmentIndex === activeStoryIndex.value
}

const getSegmentWidth = (segmentIndex) => {
  if (segmentIndex < activeStoryIndex.value) return '100%'
  if (segmentIndex > activeStoryIndex.value) return '0%'
  return `${Math.max(0, Math.min(activeStoryProgress.value * 100, 100))}%`
}

const handleResize = () => {
  applyGroupMode()
}

onMounted(() => {
  if (!groupRootEl.value) return

  groupSlider.value = new Tvist(groupRootEl.value, {
    perPage: 1,
    gap: 0,
    drag: true,
    loop: false,
    autoplay: false,
    ...getGroupSliderOptions(),
    on: {
      slideChanged: (index) => {
        activateGroup(index)
      },
    },
  })

  innerSliders.value = groups.map((_, groupIndex) => {
    const root = innerRootEls.value[groupIndex]
    if (!root) return null

    return new Tvist(root, {
      perPage: 1,
      gap: 0,
      drag: true,
      loop: false,
      holdToPause: true,
      autoplay: groupIndex === 0 ? STORY_AUTOPLAY : false,
      on: {
        autoplayProgress: ({ progress, index }) => {
          if (groupIndex !== activeGroupIndex.value) return
          const slider = innerSliders.value[groupIndex]
          const currentIndex = slider ? (slider.realIndex ?? slider.activeIndex ?? 0) : index
          if (index !== currentIndex) return
          animateActiveSegment.value = true
          activeStoryIndex.value = index
          activeStoryProgress.value = progress
        },
        slideChangeStart: (index) => {
          if (groupIndex !== activeGroupIndex.value) return
          animateActiveSegment.value = false
          activeStoryIndex.value = index
          activeStoryProgress.value = 0
          progressRenderKey.value += 1
        },
        slideChanged: (index) => {
          if (groupIndex !== activeGroupIndex.value) return
          animateActiveSegment.value = false
          activeStoryIndex.value = index
          activeStoryProgress.value = 0
          progressRenderKey.value += 1
        },
        reachEnd: () => {
          handleInnerReachEnd(groupIndex)
        },
      },
    })
  })

  activateGroup(0)
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  innerSliders.value.forEach((slider) => slider?.destroy())
  groupSlider.value?.destroy()
})
</script>

<style scoped>
.stories-demo {
  margin: 20px 0;
}

.stories-groups-nav {
  max-width: 460px;
  margin: 0 auto 10px;
  display: flex;
  gap: 8px;
}

.stories-group-chip {
  flex: 1;
  min-width: 0;
  border: 1px solid #d1d5db;
  background: #fff;
  border-radius: 10px;
  padding: 8px 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  transition: border-color 120ms linear, background-color 120ms linear;
}

.stories-group-chip--active {
  border-color: #111827;
  background: #f3f4f6;
}

.stories-group-chip__author {
  font-size: 13px;
  font-weight: 600;
  color: #111827;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.stories-group-chip__count {
  min-width: 22px;
  height: 22px;
  border-radius: 999px;
  background: #111827;
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
}

.stories-shell {
  position: relative;
  background: #0a0a0b;
  border-radius: 16px;
  overflow: hidden;
  max-width: 460px;
  margin: 0 auto;
  box-shadow: 0 20px 45px rgba(0, 0, 0, 0.35);
}

.stories-progress {
  position: absolute;
  top: 10px;
  left: 10px;
  right: 10px;
  z-index: 5;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}

.stories-progress__segment {
  height: 3px;
  background: rgba(255, 255, 255, 0.28);
  border-radius: 999px;
  overflow: hidden;
}

.stories-progress__fill {
  height: 100%;
  width: 0%;
  background: rgba(255, 255, 255, 0.96);
  transition: none;
  transform-origin: left center;
}

.stories-progress__fill--animated {
  transition: width 120ms linear;
}

.stories-groups,
.stories-group-slide,
.stories-inner-wrap,
.stories-inner,
.stories-inner-slide {
  width: 100%;
  height: 520px;
}

.stories-inner-slide {
  position: relative;
}

.stories-meta {
  position: absolute;
  left: 14px;
  right: 14px;
  bottom: 16px;
  color: #fff;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
}

.stories-author {
  font-weight: 700;
  font-size: 14px;
}

.stories-title {
  font-size: 18px;
  margin-top: 4px;
}

.stories-tap {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 35%;
  z-index: 4;
  background: transparent;
  cursor: pointer;
  touch-action: manipulation;
}

.stories-tap--prev {
  left: 0;
}

.stories-tap--next {
  right: 0;
}

.stories-caption {
  margin: 12px auto 0;
  max-width: 460px;
  color: #6b7280;
  font-size: 13px;
  text-align: center;
}

@media (max-width: 767px) {
  .stories-shell {
    border-radius: 12px;
  }

  .stories-groups,
  .stories-group-slide,
  .stories-inner-wrap,
  .stories-inner,
  .stories-inner-slide {
    height: 460px;
  }
}
</style>
