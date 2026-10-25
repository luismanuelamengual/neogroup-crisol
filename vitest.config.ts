import path from 'node:path'
import { defineConfig } from 'vitest/config'

/**
 * Vitest configuration.
 *
 *   - tests/unit  → pure logic (geometry, scoring, location picking, the Mapillary client with a fake fetch)
 *   - tests/flows → game services end to end against an in-memory SQLite database
 *                   (see tests/setup/vitest.setup.ts) with a fake imagery provider
 *
 * Decorators are handled by Vitest's transformer using the project tsconfig.json
 * (experimentalDecorators / useDefineForClassFields).
 *
 * Run with:  yarn test         (one-shot)
 *            yarn test:watch   (watch mode)
 */
const root = __dirname

export default defineConfig({
  resolve: {
    alias: [{ find: /^@\/(.*)$/, replacement: path.resolve(root, '$1') }]
  },
  test: {
    globals: false,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['tests/setup/vitest.setup.ts'],
    fileParallelism: false, // shared in-memory SQLite ⇒ run files serially
    testTimeout: 20000,
    hookTimeout: 20000
  }
})
