import { beforeEach, describe, expect, it } from 'vitest';
import { collectAIQuestions, formatAIQuestion } from '@/content/question-collector';

describe('collectAIQuestions', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('collects radio question text and option labels as AI questions', () => {
    document.body.innerHTML = `
      <fieldset>
        <legend>Are you currently enrolled in an accredited college or university and actively pursuing a degree program?</legend>
        <label><input type="radio" name="enrolled" value="Yes"> Yes</label>
        <label><input type="radio" name="enrolled" value="No"> No</label>
      </fieldset>
      <fieldset>
        <legend>This internship is intended to be a year-round opportunity. What type of internship are you seeking?</legend>
        <label><input type="radio" name="season" value="year"> Year-round</label>
        <label><input type="radio" name="season" value="season"> Seasonal</label>
      </fieldset>
    `;

    const questions = collectAIQuestions();
    expect(questions).toHaveLength(2);
    expect(questions[0]?.label).toBe(
      'Are you currently enrolled in an accredited college or university and actively pursuing a degree program?',
    );
    expect(questions[0]?.options).toEqual(['Yes', 'No']);
    const secondQuestion = questions[1];
    expect(secondQuestion && formatAIQuestion(secondQuestion)).toContain(
      'Choose exactly one option: Year-round | Seasonal',
    );
  });

  it('does not collect answered groups or protected self-identification questions', () => {
    document.body.innerHTML = `
      <fieldset>
        <legend>Are you authorized to work?</legend>
        <label><input type="radio" name="authorized" value="Yes" checked> Yes</label>
        <label><input type="radio" name="authorized" value="No"> No</label>
      </fieldset>
      <fieldset>
        <legend>Please select your race or ethnicity</legend>
        <label><input type="radio" name="race" value="one"> Option one</label>
        <label><input type="radio" name="race" value="two"> Option two</label>
      </fieldset>
    `;

    expect(collectAIQuestions()).toEqual([]);
  });
});
