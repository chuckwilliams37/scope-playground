import {
  normalizeString,
  normalizeStringArray,
  stringsMatch,
  stringArraysMatch,
  getArrayDiff,
  normalizeTitle,
  titlesMatch,
} from '../normalize';

describe('normalize', () => {
  describe('normalizeString', () => {
    it('should trim whitespace', () => {
      expect(normalizeString('  hello  ')).toBe('hello');
    });

    it('should collapse multiple spaces', () => {
      expect(normalizeString('hello    world')).toBe('hello world');
    });

    it('should convert to lowercase', () => {
      expect(normalizeString('Hello World')).toBe('hello world');
    });

    it('should handle all transformations together', () => {
      expect(normalizeString('  Hello    World  ')).toBe('hello world');
    });
  });

  describe('normalizeStringArray', () => {
    it('should normalize and sort strings', () => {
      const input = ['  Zebra  ', 'Apple', '  BANANA  '];
      const expected = ['apple', 'banana', 'zebra'];
      expect(normalizeStringArray(input)).toEqual(expected);
    });

    it('should handle empty array', () => {
      expect(normalizeStringArray([])).toEqual([]);
    });
  });

  describe('stringsMatch', () => {
    it('should match identical strings', () => {
      expect(stringsMatch('hello', 'hello')).toBe(true);
    });

    it('should match case-insensitive', () => {
      expect(stringsMatch('Hello', 'hello')).toBe(true);
    });

    it('should match with whitespace differences', () => {
      expect(stringsMatch('  hello  world  ', 'hello world')).toBe(true);
    });

    it('should not match different strings', () => {
      expect(stringsMatch('hello', 'world')).toBe(false);
    });
  });

  describe('stringArraysMatch', () => {
    it('should match identical arrays', () => {
      expect(stringArraysMatch(['a', 'b', 'c'], ['a', 'b', 'c'])).toBe(true);
    });

    it('should match arrays with different order', () => {
      expect(stringArraysMatch(['c', 'a', 'b'], ['a', 'b', 'c'])).toBe(true);
    });

    it('should match case-insensitive', () => {
      expect(stringArraysMatch(['Apple', 'Banana'], ['apple', 'banana'])).toBe(true);
    });

    it('should not match arrays with different elements', () => {
      expect(stringArraysMatch(['a', 'b'], ['a', 'c'])).toBe(false);
    });

    it('should not match arrays with different lengths', () => {
      expect(stringArraysMatch(['a', 'b'], ['a', 'b', 'c'])).toBe(false);
    });
  });

  describe('getArrayDiff', () => {
    it('should find elements in A only', () => {
      const diff = getArrayDiff(['a', 'b', 'c'], ['b', 'c', 'd']);
      expect(diff.inAOnly).toEqual(['a']);
      expect(diff.inBOnly).toEqual(['d']);
    });

    it('should handle empty arrays', () => {
      const diff = getArrayDiff([], ['a', 'b']);
      expect(diff.inAOnly).toEqual([]);
      expect(diff.inBOnly).toEqual(['a', 'b']);
    });

    it('should handle identical arrays', () => {
      const diff = getArrayDiff(['a', 'b'], ['a', 'b']);
      expect(diff.inAOnly).toEqual([]);
      expect(diff.inBOnly).toEqual([]);
    });

    it('should be case-insensitive', () => {
      const diff = getArrayDiff(['Apple'], ['apple']);
      expect(diff.inAOnly).toEqual([]);
      expect(diff.inBOnly).toEqual([]);
    });
  });

  describe('normalizeTitle', () => {
    it('should trim and collapse whitespace but preserve case', () => {
      expect(normalizeTitle('  Hello    World  ')).toBe('Hello World');
    });
  });

  describe('titlesMatch', () => {
    it('should match case-insensitive', () => {
      expect(titlesMatch('Hello World', 'hello world')).toBe(true);
    });

    it('should match with whitespace differences', () => {
      expect(titlesMatch('  Hello  World  ', 'Hello World')).toBe(true);
    });
  });
});
