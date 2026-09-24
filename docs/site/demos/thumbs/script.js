const main = new TvistV1('.main-slider', { perPage: 1, arrows: true });
const thumbs = new TvistV1('.thumb-slider', { perPage: 4, gap: 12, isNavigation: true });
main.sync(thumbs);
