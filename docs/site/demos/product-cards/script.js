const showcase = document.querySelector('.product-demo');
const slider = new TvistV1(showcase.querySelector('.product-slider'), {
  perPage: 3,
  gap: 20,
  drag: true,
  focusableElements: 'button, a, input, select, textarea',
  arrows: {
    prev: showcase.querySelector('[data-products-prev]'),
    next: showcase.querySelector('[data-products-next]'),
  },
  pagination: {
    container: showcase.querySelector('.product-demo__pagination'),
    clickable: true,
  },
  breakpoints: {
    720: { perPage: 2, gap: 16 },
    480: { perPage: 1, gap: 12 },
  },
});

// В демо корзина хранится в памяти страницы.
const cart = new Map();
const cartCount = showcase.querySelector('[data-cart-count]');
const status = showcase.querySelector('.product-demo__status');
let total = 0;

function updateCartButton(card) {
  const size = card.querySelector('select').value;
  const quantity = cart.get(`${card.dataset.product}:${size}`) || 0;
  card.querySelector('[data-add-to-cart]').textContent = quantity
    ? `В корзине · ${quantity}`
    : 'В корзину';
}

showcase.addEventListener('click', (event) => {
  const favorite = event.target.closest('[data-product-favorite]');
  if (favorite) {
    favorite.setAttribute('aria-pressed', String(favorite.getAttribute('aria-pressed') !== 'true'));
    return;
  }

  const button = event.target.closest('[data-add-to-cart]');
  if (!button) return;
  const card = button.closest('[data-product]');
  const size = card.querySelector('select').value;
  const key = `${card.dataset.product}:${size}`;
  cart.set(key, (cart.get(key) || 0) + 1);
  total += 1;
  cartCount.textContent = String(total);
  updateCartButton(card);
  status.textContent = `${card.querySelector('.product-card__title').textContent}, размер ${size}: в корзине ${cart.get(key)} шт.`;
});

showcase.addEventListener('change', (event) => {
  if (event.target.matches('.product-card__size select')) {
    updateCartButton(event.target.closest('[data-product]'));
  }
});
