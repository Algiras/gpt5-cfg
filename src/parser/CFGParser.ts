import { CFGGrammar, CFGRule, ParseNode, ParsedInput } from '../types';

export class CFGParser {
  private grammar: CFGGrammar;
  private input: string;
  private position: number;

  constructor(grammar: CFGGrammar) {
    this.grammar = grammar;
    this.input = '';
    this.position = 0;
  }

  /**
   * Parse input string according to the loaded grammar
   */
  parse(input: string): ParsedInput {
    this.input = input.trim();
    this.position = 0;

    try {
      const parseTree = this.parseSymbol(this.grammar.startSymbol);
      const isValid = this.position >= this.input.length;
      
      return {
        original: input,
        parsed: parseTree ? [parseTree] : [],
        isValid,
        errors: isValid ? [] : [`Unexpected input at position ${this.position}`]
      };
    } catch (error) {
      return {
        original: input,
        parsed: [],
        isValid: false,
        errors: [error instanceof Error ? error.message : 'Parse error']
      };
    }
  }

  /**
   * Parse a specific symbol (terminal or non-terminal)
   */
  private parseSymbol(symbol: string): ParseNode | null {
    // Skip whitespace
    this.skipWhitespace();

    if (this.position >= this.input.length) {
      return null;
    }

    // Check if it's a terminal
    if (this.grammar.terminals.includes(symbol)) {
      return this.parseTerminal(symbol);
    }

    // Check if it's a non-terminal
    if (this.grammar.nonTerminals.includes(symbol)) {
      return this.parseNonTerminal(symbol);
    }

    throw new Error(`Unknown symbol: ${symbol}`);
  }

  /**
   * Parse a terminal symbol
   */
  private parseTerminal(terminal: string): ParseNode | null {
    const startPos = this.position;
    
    // Handle quoted terminals
    if (terminal.startsWith('"') && terminal.endsWith('"')) {
      const expectedText = terminal.slice(1, -1);
      if (this.input.substring(this.position, this.position + expectedText.length) === expectedText) {
        this.position += expectedText.length;
        return {
          type: 'terminal',
          value: expectedText,
          position: { start: startPos, end: this.position }
        };
      }
    }
    
    // Handle regex-like terminals
    if (terminal.startsWith('/') && terminal.endsWith('/')) {
      const pattern = new RegExp(terminal.slice(1, -1));
      const match = this.input.substring(this.position).match(pattern);
      if (match && match.index === 0) {
        const matchedText = match[0];
        this.position += matchedText.length;
        return {
          type: 'terminal',
          value: matchedText,
          position: { start: startPos, end: this.position }
        };
      }
    }

    // Handle word terminals
    const word = this.extractWord();
    if (word === terminal) {
      return {
        type: 'terminal',
        value: word,
        position: { start: startPos, end: this.position }
      };
    }

    return null;
  }

  /**
   * Parse a non-terminal symbol by trying all its productions
   */
  private parseNonTerminal(nonTerminal: string): ParseNode | null {
    const rule = this.grammar.rules.find(r => r.name === nonTerminal);
    if (!rule) {
      throw new Error(`No rule found for non-terminal: ${nonTerminal}`);
    }

    const startPos = this.position;

    // Try each production
    for (const production of rule.productions) {
      const savedPosition = this.position;
      try {
        const children = this.parseProduction(production);
        if (children !== null) {
          return {
            type: 'non-terminal',
            value: nonTerminal,
            children,
            position: { start: startPos, end: this.position }
          };
        }
      } catch (error) {
        // Backtrack and try next production
        this.position = savedPosition;
      }
    }

    return null;
  }

  /**
   * Parse a production (sequence of symbols)
   */
  private parseProduction(production: string): ParseNode[] | null {
    const symbols = this.tokenizeProduction(production);
    const children: ParseNode[] = [];

    for (const symbol of symbols) {
      const node = this.parseSymbol(symbol);
      if (node === null) {
        return null;
      }
      children.push(node);
    }

    return children;
  }

  /**
   * Tokenize a production string into individual symbols
   */
  private tokenizeProduction(production: string): string[] {
    const tokens: string[] = [];
    let current = '';
    let inQuotes = false;
    let inRegex = false;

    for (let i = 0; i < production.length; i++) {
      const char = production[i];

      if (char === '"' && !inRegex) {
        inQuotes = !inQuotes;
        current += char;
      } else if (char === '/' && !inQuotes) {
        inRegex = !inRegex;
        current += char;
      } else if (char === ' ' && !inQuotes && !inRegex) {
        if (current.trim()) {
          tokens.push(current.trim());
          current = '';
        }
      } else {
        current += char;
      }
    }

    if (current.trim()) {
      tokens.push(current.trim());
    }

    return tokens;
  }

  /**
   * Extract a word from current position
   */
  private extractWord(): string {
    const start = this.position;
    while (this.position < this.input.length && /[a-zA-Z0-9_]/.test(this.input[this.position])) {
      this.position++;
    }
    return this.input.substring(start, this.position);
  }

  /**
   * Skip whitespace characters
   */
  private skipWhitespace(): void {
    while (this.position < this.input.length && /\s/.test(this.input[this.position])) {
      this.position++;
    }
  }

  /**
   * Load grammar from a simple text format
   */
  static loadGrammarFromText(grammarText: string): CFGGrammar {
    const lines = grammarText.split('\n').map(line => line.trim()).filter(line => line && !line.startsWith('#'));
    const rules: CFGRule[] = [];
    const nonTerminals = new Set<string>();
    const terminals = new Set<string>();
    let startSymbol = '';

    for (const line of lines) {
      if (line.includes('->')) {
        const [left, right] = line.split('->').map(part => part.trim());
        const productions = right.split('|').map(prod => prod.trim());
        
        rules.push({
          name: left,
          productions
        });
        
        nonTerminals.add(left);
        if (!startSymbol) {
          startSymbol = left;
        }

        // Extract terminals from productions
        for (const production of productions) {
          const tokens = CFGParser.prototype.tokenizeProduction(production);
          for (const token of tokens) {
            if (token.startsWith('"') && token.endsWith('"')) {
              terminals.add(token);
            } else if (token.startsWith('/') && token.endsWith('/')) {
              terminals.add(token);
            } else if (!nonTerminals.has(token)) {
              terminals.add(token);
            }
          }
        }
      }
    }

    return {
      startSymbol,
      rules,
      terminals: Array.from(terminals),
      nonTerminals: Array.from(nonTerminals)
    };
  }
}
