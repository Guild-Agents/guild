import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: [
      '**/node_modules/**',
      '.claude/worktrees/**',
    ],
    coverage: {
      include: ['src/**/*.js'],
      exclude: [
        'src/**/__tests__/**',
        '.claude/worktrees/**',
      ],
    },
  },
});
