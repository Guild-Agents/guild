import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      include: ['src/**/*.js'],
      exclude: [
        'src/**/__tests__/**',
        '.claude/worktrees/**',
      ],
    },
  },
});
