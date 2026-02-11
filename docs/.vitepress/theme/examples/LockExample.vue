<template>
  <ExampleCard
    title="Lock — блокировка слайдера"
    description="Когда контент помещается в контейнер и листать некуда, слайдер переходит в состояние lock: стрелки отключаются, drag не срабатывает, на root вешается класс tvist-v1--locked"
  >
    <div class="demo-wrapper">
      <div class="demo-section">
        <h3>Заблокирован (perPage: 2, 2 слайда, без loop)</h3>
        <p class="hint">Весь контент виден, листать некуда → слайдер заблокирован.</p>
        <div ref="lockedEl" class="tvist-v1 lock-demo">
          <div class="tvist-v1__container">
            <div class="tvist-v1__slide"><span>1</span></div>
            <div class="tvist-v1__slide"><span>2</span></div>
          </div>
        </div>
        <div class="controls">
          <button @click="sliderLocked?.prev()" :disabled="!sliderLocked?.canScrollPrev">← Prev</button>
          <span class="status" :class="{ locked: stateLocked.isLocked }">
            {{ stateLocked.isLocked ? 'Заблокирован' : 'Разблокирован' }}
          </span>
          <button @click="sliderLocked?.next()" :disabled="!sliderLocked?.canScrollNext">Next →</button>
        </div>
      </div>

      <div class="demo-section">
        <h3>Разблокирован (perPage: 2, 6 слайдов, без loop)</h3>
        <p class="hint">Контент не помещается → слайдер активен, стрелки и drag работают.</p>
        <div ref="unlockedEl" class="tvist-v1 lock-demo">
          <div class="tvist-v1__container">
            <div v-for="i in 6" :key="i" class="tvist-v1__slide"><span>{{ i }}</span></div>
          </div>
        </div>
        <div class="controls">
          <button @click="sliderUnlocked?.prev()" :disabled="!sliderUnlocked?.canScrollPrev">← Prev</button>
          <span class="status" :class="{ locked: stateUnlocked.isLocked }">
            {{ stateUnlocked.isLocked ? 'Заблокирован' : 'Разблокирован' }}
          </span>
          <button @click="sliderUnlocked?.next()" :disabled="!sliderUnlocked?.canScrollNext">Next →</button>
        </div>
      </div>

      <div class="demo-section events" v-if="eventLog.length">
        <h3>События lock / unlock</h3>
        <ul class="event-log">
          <li v-for="(entry, i) in eventLog" :key="i">{{ entry }}</li>
        </ul>
      </div>
    </div>
  </ExampleCard>
</template>

<script setup>
import { ref, onMounted, onUnmounted, reactive } from 'vue'
import { Tvist } from 'tvist'
import ExampleCard from '../ExampleCard.vue'

const lockedEl = ref(null)
const unlockedEl = ref(null)
const sliderLocked = ref(null)
const sliderUnlocked = ref(null)

const stateLocked = reactive({ isLocked: false })
const stateUnlocked = reactive({ isLocked: false })
const eventLog = reactive([])

const pushLog = (msg) => {
  eventLog.push(`${new Date().toLocaleTimeString()} — ${msg}`)
  if (eventLog.length > 10) eventLog.shift()
}

onMounted(() => {
  if (lockedEl.value) {
    sliderLocked.value = new Tvist(lockedEl.value, {
      perPage: 2,
      gap: 16,
      speed: 300,
      drag: true,
      loop: false,
      on: {
        lock: () => {
          stateLocked.isLocked = true
          pushLog('Слайдер 1: lock')
        },
        unlock: () => {
          stateLocked.isLocked = false
          pushLog('Слайдер 1: unlock')
        },
        created: () => {
          stateLocked.isLocked = sliderLocked.value?.engine.isLocked ?? false
        }
      }
    })
  }

  if (unlockedEl.value) {
    sliderUnlocked.value = new Tvist(unlockedEl.value, {
      perPage: 2,
      gap: 16,
      speed: 300,
      drag: true,
      loop: false,
      on: {
        lock: () => {
          stateUnlocked.isLocked = true
          pushLog('Слайдер 2: lock')
        },
        unlock: () => {
          stateUnlocked.isLocked = false
          pushLog('Слайдер 2: unlock')
        },
        created: () => {
          stateUnlocked.isLocked = sliderUnlocked.value?.engine.isLocked ?? false
        }
      }
    })
  }
})

onUnmounted(() => {
  sliderLocked.value?.destroy()
  sliderUnlocked.value?.destroy()
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
  margin-bottom: 32px;
}

.demo-section:last-child {
  margin-bottom: 0;
}

.demo-section h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.hint {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #666;
}

.lock-demo {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  margin-bottom: 16px;
  overflow: hidden;
}

.lock-demo.tvist-v1--locked {
  outline: 2px solid #667eea;
  outline-offset: 2px;
}

.tvist-v1__slide {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 160px;
  font-size: 32px;
  font-weight: bold;
  color: white;
  user-select: none;
}

.tvist-v1__slide:nth-child(6n+1) { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
.tvist-v1__slide:nth-child(6n+2) { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }
.tvist-v1__slide:nth-child(6n+3) { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); }
.tvist-v1__slide:nth-child(6n+4) { background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); }
.tvist-v1__slide:nth-child(6n+5) { background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); }
.tvist-v1__slide:nth-child(6n+6) { background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%); }

.controls {
  display: flex;
  gap: 12px;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
}

button {
  background: #667eea;
  color: white;
  border: none;
  padding: 10px 20px;
  font-size: 14px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
}

button:hover:not(:disabled) {
  background: #5568d3;
}

button:disabled {
  background: #ccc;
  cursor: not-allowed;
  opacity: 0.7;
}

.status {
  font-size: 14px;
  font-weight: 500;
  min-width: 120px;
  text-align: center;
}

.status.locked {
  color: #667eea;
}

.events .event-log {
  margin: 0;
  padding-left: 20px;
  font-size: 13px;
  color: #555;
  max-height: 120px;
  overflow-y: auto;
}

.events .event-log li {
  margin-bottom: 4px;
}
</style>
