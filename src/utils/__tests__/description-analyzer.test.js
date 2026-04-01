import { describe, it, expect } from 'vitest';
import { analyzeGaps, generateSuggestions } from '../description-analyzer.js';

describe('analyzeGaps', () => {
  it('identifies missing keywords from failed triggers', () => {
    const triggerResults = [
      { prompt: 'implement this feature end to end', expected: true, actual: false, score: 0.1 },
      { prompt: 'build the full implementation pipeline', expected: true, actual: true, score: 0.8 },
      { prompt: 'review my code', expected: false, actual: false, score: 0.0 },
    ];
    const description = 'Full pipeline: evaluation -> spec -> implementation -> review -> QA';

    const gaps = analyzeGaps(triggerResults, description);
    expect(gaps.failedPrompts).toHaveLength(1);
    expect(gaps.failedPrompts[0]).toBe('implement this feature end to end');
    expect(gaps.missingKeywords).toContain('end');
  });

  it('returns empty arrays when no failed triggers', () => {
    const triggerResults = [
      { prompt: 'build a feature', expected: true, actual: true, score: 0.8 },
      { prompt: 'review code', expected: false, actual: false, score: 0.0 },
    ];
    const description = 'Build a new feature';

    const gaps = analyzeGaps(triggerResults, description);
    expect(gaps.missingKeywords).toHaveLength(0);
    expect(gaps.failedPrompts).toHaveLength(0);
  });

  it('ignores stopwords in missing keywords', () => {
    const triggerResults = [
      { prompt: 'I want to use this for my project', expected: true, actual: false, score: 0.0 },
    ];
    const description = 'Project scaffolding tool';

    const gaps = analyzeGaps(triggerResults, description);
    expect(gaps.missingKeywords).not.toContain('for');
    expect(gaps.missingKeywords).not.toContain('my');
  });
});

describe('generateSuggestions', () => {
  it('ranks keywords by frequency across failed prompts', () => {
    const gapsList = [
      {
        skill: 'build-feature',
        currentDescription: 'Full pipeline: evaluation -> spec -> implementation -> review -> QA',
        missingKeywords: ['end', 'ship', 'end'],
        failedPrompts: ['implement end to end', 'ship this end to end'],
      },
    ];

    const suggestions = generateSuggestions(gapsList);
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].skill).toBe('build-feature');

    const endKeyword = suggestions[0].suggestedKeywords.find(k => k.word === 'end');
    expect(endKeyword.confidence).toBe('high');
  });

  it('marks single-occurrence keywords as medium confidence', () => {
    const gapsList = [
      {
        skill: 'council',
        currentDescription: 'Debate decisions with multiple agents',
        missingKeywords: ['choose'],
        failedPrompts: ['help me choose between options'],
      },
    ];

    const suggestions = generateSuggestions(gapsList);
    expect(suggestions[0].suggestedKeywords[0].confidence).toBe('medium');
  });

  it('returns empty for skills with no gaps', () => {
    const gapsList = [
      {
        skill: 'build-feature',
        currentDescription: 'desc',
        missingKeywords: [],
        failedPrompts: [],
      },
    ];

    const suggestions = generateSuggestions(gapsList);
    expect(suggestions).toHaveLength(0);
  });
});
