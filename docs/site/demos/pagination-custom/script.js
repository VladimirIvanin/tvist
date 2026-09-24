const slider = new TvistV1('.tvist-v1', { perPage: 1, pagination: { type: 'custom', renderCustom: (current, total) => '<span>Слайд ' + current + ' из ' + total + '</span>' }, arrows: true });
