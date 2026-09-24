const slider = new TvistV1('.tvist-v1', { perPage: 2, gap: 16, arrows: true });
document.querySelector('.demo-action').addEventListener('click', () => slider.updateOptions({ perPage: 3 }));
