const demo = document.querySelector('.cube-demo');
const slider = new TvistV1(demo.querySelector('.cube-slider'), {
  effect: 'cube',
  perPage: 1,
  speed: 650,
  drag: true,
  arrows: {
    prev: demo.querySelector('[data-cube-prev]'),
    next: demo.querySelector('[data-cube-next]'),
  },
  pagination: {
    type: 'fraction',
    container: demo.querySelector('.cube-pagination'),
  },
  cubeEffect: { slideShadows: true },
});
