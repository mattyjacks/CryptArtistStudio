import { describe, it, expect } from 'vitest';

// Simulating the dual-mode search logic
function isNumericSearch(query: string): boolean {
  return /^\d+$/.test(query);
}

describe('Command Palette Search Logic', () => {
  it('should identify numeric only strings as ID searches', () => {
    expect(isNumericSearch('1234567890')).toBe(true);
    expect(isNumericSearch('083955778141416308385281303380917386611126225891809899831070339453206')).toBe(true);
  });

  it('should identify strings with letters as Alphanumeric/Name searches', () => {
    expect(isNumericSearch('project1')).toBe(false);
    expect(isNumericSearch('abc')).toBe(false);
    expect(isNumericSearch('123a')).toBe(false);
    expect(isNumericSearch('  123  ')).toBe(false); // Leading/trailing whitespace makes it non-numeric until trimmed
  });

  it('should identify empty strings as non-numeric', () => {
    expect(isNumericSearch('')).toBe(false);
    expect(isNumericSearch(' ')).toBe(false);
  });
});
