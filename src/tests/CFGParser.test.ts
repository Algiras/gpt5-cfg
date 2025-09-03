import { CFGParser } from '../parser/CFGParser';

describe('CFGParser', () => {
  let parser: CFGParser;

  beforeEach(() => {
    const grammar = CFGParser.loadGrammarFromText(`
      Expression -> Term
      Expression -> Expression "+" Term
      Term -> Number
      Number -> /[0-9]+/
    `);
    parser = new CFGParser(grammar);
  });

  test('should parse simple number', () => {
    const result = parser.parse('42');
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.parsed).toHaveLength(1);
  });

  test('should parse addition expression', () => {
    const result = parser.parse('42 + 13');
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('should handle invalid input', () => {
    const result = parser.parse('invalid');
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('should load grammar from text', () => {
    const grammarText = `
      S -> A B
      A -> "hello"
      B -> "world"
    `;
    const grammar = CFGParser.loadGrammarFromText(grammarText);
    
    expect(grammar.startSymbol).toBe('S');
    expect(grammar.rules).toHaveLength(3);
    expect(grammar.nonTerminals).toContain('S');
    expect(grammar.terminals).toContain('"hello"');
  });
});
