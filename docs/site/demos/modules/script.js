const slider = new TvistV1('.tvist-v1', { perPage: 2, gap: 16, arrows: true, pagination: true, autoplay: { delay: 3000, pauseOnHover: true } });

const motion = slider.autoplay;
const motionButton = document.querySelector('.demo-motion-toggle');
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  motion?.pause();
  motionButton.textContent = 'Воспроизвести';
}
motionButton.addEventListener('click', () => {
  if (motion?.isPaused()) { motion.resume(); motionButton.textContent = 'Пауза'; }
  else { motion?.pause(); motionButton.textContent = 'Воспроизвести'; }
});
