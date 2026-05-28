import { describe, it, expect } from 'vitest';
import { classifySubject } from './classifier';

describe('classifySubject', () => {
  it('routes circuit questions to Electrical', () => {
    expect(classifySubject('Find the current through the resistor given a 12V source and Kirchhoff voltage law')).toBe(
      'Electrical',
    );
  });

  it('routes calculus to Math', () => {
    expect(classifySubject('Compute the integral of x^2 and its derivative')).toBe('Math');
  });

  it('routes mitosis to Biology', () => {
    expect(classifySubject('Explain the phases of mitosis and what happens to chromosomes')).toBe('Biology');
  });

  it('routes algorithms to CS', () => {
    expect(classifySubject('What is the time complexity Big-O of this recursion algorithm?')).toBe('CS');
  });

  it('routes stoichiometry to Chemistry', () => {
    expect(classifySubject('Balance the reaction and compute moles for this stoichiometry titration')).toBe(
      'Chemistry',
    );
  });

  it('falls back to General for vague input', () => {
    expect(classifySubject('Can you help me understand this?')).toBe('General');
  });
});
