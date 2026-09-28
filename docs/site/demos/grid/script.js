const slider = new TvistV1('.grid-slider', {
  grid: { rows: 2, cols: 2, gap: { row: 12, col: 12 } },
  arrows: { prev: '#grid-prev', next: '#grid-next', addIcons: false },
  breakpoints: {
    480: { grid: { rows: 2, cols: 1, gap: 12 } }
  }
});

const pageCounter = document.querySelector('#grid-pagination');
const updatePageCounter = () => {
  pageCounter.textContent = `${slider.activeIndex + 1} / ${slider.slideCount}`;
};
slider.on('slideChangeEnd', updatePageCounter);
slider.on('refresh', updatePageCounter);
updatePageCounter();
