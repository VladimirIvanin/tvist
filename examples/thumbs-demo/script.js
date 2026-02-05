import '../shared/header.js';
import Tvist from '../../src/index.ts';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Main Slider
    const main = new Tvist('#main-slider', {
        perPage: 1,
        gap: 10,
        arrows: false,
        pagination: false,
    });

    // 2. Thumbnail Slider
    const thumbs = new Tvist('#thumb-slider', {
        perPage: 4,
        gap: 10,
        isNavigation: true, // Mark as navigation
        pagination: false,
        arrows: true,
        breakpoints: {
            600: {
                perPage: 3,
            }
        }
    });

    // 3. Sync
    main.sync(thumbs);
});
