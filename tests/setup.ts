/**
 * Vitest setup file
 */

import { afterEach } from 'vitest';

// Cleanup после каждого теста
afterEach(() => {
  document.body.innerHTML = '';
});

