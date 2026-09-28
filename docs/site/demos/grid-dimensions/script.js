const slider = new TvistV1('.journal-slider', {
  grid: {
    gap: 12,
    dimensions: [[1, 1], [2, 1], [1, 2], [1, 1]]
  },
  arrows: { prev: '#journal-prev', next: '#journal-next', addIcons: false },
  breakpoints: {
    480: {
      grid: { gap: 12, dimensions: [[1, 1], [2, 1], [2, 1], [1, 1]] }
    }
  }
});

const pageCounter = document.querySelector('#journal-pagination');
const updatePageCounter = () => {
  pageCounter.textContent = `${slider.activeIndex + 1} / ${slider.slideCount}`;
};
slider.on('slideChangeEnd', updatePageCounter);
slider.on('refresh', updatePageCounter);
updatePageCounter();
