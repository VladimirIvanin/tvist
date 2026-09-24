const main = new TvistV1('.main-slider', { perPage: 1, arrows: true });
const thumbs = new TvistV1('.thumb-slider', { direction: 'vertical', perPage: 4, gap: 10, isNavigation: true });
main.sync(thumbs);
