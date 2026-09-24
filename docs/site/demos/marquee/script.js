const slider = new TvistV1('.tvist-v1', { perPage: 3, gap: 16, marquee: { speed: 30, pauseOnHover: true } });

const motion = slider.getModule('marquee')?.getMarquee();
const motionButton = document.querySelector('.demo-motion-toggle');
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  motion?.pause();
  motionButton.textContent = 'Воспроизвести';
}
motionButton.addEventListener('click', () => {
  if (motion?.isPaused()) { motion.resume(); motionButton.textContent = 'Пауза'; }
  else { motion?.pause(); motionButton.textContent = 'Воспроизвести'; }
});
