import Tvist from '../src/index'

function updateInfo(slider: Tvist, infoId: string) {
  const info = document.getElementById(infoId)
  if (!info) return
  
  const isLocked = slider.engine.isLocked
  info.innerHTML = `
    <strong>Status:</strong> ${isLocked ? '🔒 LOCKED (drag disabled)' : '🔓 UNLOCKED (drag enabled)'}<br>
    <strong>Can scroll:</strong> prev=${slider.engine.canScrollPrev()}, next=${slider.engine.canScrollNext()}<br>
    <strong>Slides:</strong> ${slider.engine.slideCount}<br>
    <strong>Current index:</strong> ${slider.engine.activeIndex}
  `
  info.style.cssText = `
    padding: 10px;
    margin: 10px 0 20px;
    background: ${isLocked ? '#ffebee' : '#e8f5e9'};
    border: 2px solid ${isLocked ? '#c62828' : '#2e7d32'};
    border-radius: 4px;
    font-size: 14px;
  `
}

// Test 1: Grid 2x2 with 8 slides
const slider1 = new Tvist('#slider1', {
  grid: {
    rows: 2,
    cols: 2,
    gap: 10
  }
})

// Test 2: Grid 2x2 with 4 slides
const slider2 = new Tvist('#slider2', {
  grid: {
    rows: 2,
    cols: 2,
    gap: 10
  }
})

// Update info after init
setTimeout(() => {
  updateInfo(slider1, 'info1')
  updateInfo(slider2, 'info2')
}, 100)

// Update on events
slider1.on('lock', () => updateInfo(slider1, 'info1'))
slider1.on('unlock', () => updateInfo(slider1, 'info1'))
slider1.on('slideChanged', () => updateInfo(slider1, 'info1'))

slider2.on('lock', () => updateInfo(slider2, 'info2'))
slider2.on('unlock', () => updateInfo(slider2, 'info2'))
slider2.on('slideChanged', () => updateInfo(slider2, 'info2'))

console.log('Sandbox initialized!', { slider1, slider2 })
