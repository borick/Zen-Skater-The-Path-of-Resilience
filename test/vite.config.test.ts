import { defineConfig } from 'vite';
import { expect, test } from 'vitest';
import config from '../vite.config';

test('vite config base property should be /zen-skater/', () => {
  const env = { GEMINI_API_KEY: 'test-key' };
  const resolvedConfig = config({ mode: 'test' });
  expect(resolvedConfig.base).toBe('/zen-skater/');
});
