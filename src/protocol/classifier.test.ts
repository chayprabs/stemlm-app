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
    expect(classifySubject('I have a question about my homework')).toBe('General');
    expect(classifySubject('')).toBe('General');
  });
});

/**
 * Representative-question table — the brief asks Auto to "almost every time find
 * the closest match" across all subjects. These assert the routing for typical
 * homework phrasings, including a few cross-domain traps.
 */
describe('classifySubject — subject coverage table', () => {
  const cases: [string, string][] = [
    // Physics
    ['A block slides down a frictionless incline at 30 degrees, find its acceleration', 'Physics'],
    ['Draw the free-body diagram for a 5 kg mass hanging from two ropes', 'Physics'],
    ['A projectile is launched at 20 m/s; find its range and max height', 'Physics'],
    ['Use conservation of momentum for this elastic collision', 'Physics'],
    ['Find the angle of refraction using Snell\'s law for light entering glass', 'Physics'],
    // Chemistry
    ['Balance this redox reaction and find the cell potential', 'Chemistry'],
    ['Calculate the pH of a 0.1 M acetic acid buffer solution', 'Chemistry'],
    ['How many moles of NaOH are needed to titrate the HCl?', 'Chemistry'],
    ['Draw the Lewis structure of CO2 and predict its geometry', 'Chemistry'],
    // Math
    ['Find the derivative of sin(x) times e^x using the product rule', 'Math'],
    ['Evaluate the definite integral of x^2 from 0 to 3', 'Math'],
    ['Find the eigenvalues of this 2x2 matrix', 'Math'],
    ['Prove this theorem about the sum of an arithmetic series', 'Math'],
    ['Solve the quadratic equation and factor the polynomial', 'Math'],
    // Biology
    ['Explain the light reactions of photosynthesis in the chloroplast', 'Biology'],
    ['Make a Punnett square for a heterozygous cross', 'Biology'],
    ['Describe how an enzyme lowers the activation energy of a reaction', 'Biology'],
    ['What happens to chromosomes during meiosis?', 'Biology'],
    // CS
    ['What is the time complexity of merge sort?', 'CS'],
    ['Trace this recursive function on a binary tree', 'CS'],
    ['Implement Dijkstra\'s algorithm for the shortest path in a graph', 'CS'],
    ['Write a Python function to reverse a linked list', 'CS'],
    // Electrical
    ['Find the Thevenin equivalent resistance seen by the load', 'Electrical'],
    ['Use KCL and node-voltage analysis to find the node voltages', 'Electrical'],
    ['Design a logic gate truth table for this boolean expression', 'Electrical'],
    ['Find the impedance of this RLC circuit at resonance', 'Electrical'],
    // Mechanical
    ['Compute the bending stress and factor of safety for this shaft under torque', 'Mechanical'],
    ['Analyze the Carnot cycle efficiency of this heat engine', 'Mechanical'],
    ['Use Bernoulli\'s equation for fluid mechanics in this pipe', 'Mechanical'],
    // Civil
    ['Draw the shear force and bending moment diagram for a simply supported beam', 'Civil'],
    ['Find the support reactions for this truss with a distributed load', 'Civil'],
    ['Design the reinforced concrete column for this load', 'Civil'],
    // Chemical
    ['Perform a mass balance on this distillation column with reflux', 'Chemical'],
    ['Size the CSTR reactor for this reaction with a control volume', 'Chemical'],
    ['Apply Raoult\'s law for vapor-liquid equilibrium in this flash drum', 'Chemical'],
  ];

  it.each(cases)('routes %j → %s', (q, expected) => {
    expect(classifySubject(q)).toBe(expected);
  });
});
