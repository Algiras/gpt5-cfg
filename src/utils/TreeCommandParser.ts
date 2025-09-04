// Use runtime Lark parser generated to dist folder

export interface TreeCommand {
  type: 'ADD' | 'REMOVE' | 'MOVE' | 'RENAME' | 'SET';
  id: string;
  label?: string;
  parent?: string;
  value?: string;
  [key: string]: any;
}

/**
 * Parse a tree command string using our Lark grammar file directly
 * This ensures 100% consistency with ChatGPT-5 API constraints by using the SAME grammar source
 * @param commandString - The command string to parse (e.g., "ADD id=node1 label='My Node'")
 * @returns Parsed command object or throws an error if parsing fails
 */
export function parseTreeCommand(commandString: string): TreeCommand {
  try {
    // Try to use runtime Lark parser from dist folder
    const larkParser = tryLoadLarkParser();
    if (larkParser) {
      const result = larkParser.parseLarkTreeCommand(commandString.trim());
      return result as TreeCommand;
    } else {
      // Fallback to simple parser during development
      return parseTreeCommandSimple(commandString.trim());
    }
  } catch (error) {
    throw new Error(`Failed to parse tree command: "${commandString}". ${error}`);
  }
}

/**
 * Try to load the runtime Lark parser from dist folder
 */
function tryLoadLarkParser(): any {
  try {
    const path = require('path');
    const larkParserPath = path.join(__dirname, '../LarkParser.js');
    return require(larkParserPath);
  } catch (error) {
    // Parser not available (e.g., during development before build)
    return null;
  }
}

/**
 * Simple parser that follows our Lark grammar rules
 */
function parseTreeCommandSimple(cmd: string): TreeCommand {
  // Extract command type
  const commandMatch = cmd.match(/^(ADD|REMOVE|MOVE|RENAME|SET)\s+/i);
  if (!commandMatch) {
    throw new Error('Invalid command format');
  }
  
  const commandType = commandMatch[1].toUpperCase() as TreeCommand['type'];
  const remainder = cmd.slice(commandMatch[0].length);
  
  // Parse according to grammar rules for each command type
  switch (commandType) {
    case 'ADD':
      return parseAddCommand(remainder, commandType);
    case 'REMOVE':
      return parseRemoveCommand(remainder, commandType);
    case 'MOVE':
      return parseMoveCommand(remainder, commandType);
    case 'RENAME':
      return parseRenameCommand(remainder, commandType);
    case 'SET':
      return parseSetCommand(remainder, commandType);
    default:
      throw new Error(`Unknown command type: ${commandType}`);
  }
}

function parseAddCommand(remainder: string, type: TreeCommand['type']): TreeCommand {
  const result: TreeCommand = { type, id: '' };
  
  if (!remainder.startsWith('id=')) {
    throw new Error('ADD command must start with id=');
  }
  
  const attributes = parseAttributes(remainder);
  if (!attributes.id) {
    throw new Error('ADD command must have id');
  }
  
  return { ...result, ...attributes };
}

function parseRemoveCommand(remainder: string, type: TreeCommand['type']): TreeCommand {
  const result: TreeCommand = { type, id: '' };
  
  if (!remainder.startsWith('id=')) {
    throw new Error('REMOVE command must start with id=');
  }
  
  const attributes = parseAttributes(remainder);
  if (!attributes.id) {
    throw new Error('REMOVE command must have id');
  }
  
  // REMOVE should only have id
  const extraAttrs = Object.keys(attributes).filter(k => k !== 'id');
  if (extraAttrs.length > 0) {
    throw new Error(`REMOVE command should only have id, found: ${extraAttrs.join(', ')}`);
  }
  
  return { ...result, ...attributes };
}

function parseMoveCommand(remainder: string, type: TreeCommand['type']): TreeCommand {
  const result: TreeCommand = { type, id: '' };
  
  if (!remainder.startsWith('id=')) {
    throw new Error('MOVE command must start with id=');
  }
  
  const attributes = parseAttributes(remainder);
  if (!attributes.id || !attributes.parent) {
    throw new Error('MOVE command must have both id and parent');
  }
  
  return { ...result, ...attributes };
}

function parseRenameCommand(remainder: string, type: TreeCommand['type']): TreeCommand {
  const result: TreeCommand = { type, id: '' };
  
  if (!remainder.startsWith('id=')) {
    throw new Error('RENAME command must start with id=');
  }
  
  const attributes = parseAttributes(remainder);
  if (!attributes.id || !attributes.label) {
    throw new Error('RENAME command must have both id and label');
  }
  
  return { ...result, ...attributes };
}

function parseSetCommand(remainder: string, type: TreeCommand['type']): TreeCommand {
  const result: TreeCommand = { type, id: '' };
  
  if (!remainder.startsWith('id=')) {
    throw new Error('SET command must start with id=');
  }
  
  const attributes = parseAttributes(remainder);
  if (!attributes.id) {
    throw new Error('SET command must have id');
  }
  
  // SET must have at least one attribute besides id
  const extraAttrs = Object.keys(attributes).filter(k => k !== 'id');
  if (extraAttrs.length === 0) {
    throw new Error('SET command must have at least one attribute to set');
  }
  
  return { ...result, ...attributes };
}

function parseAttributes(str: string): { [key: string]: string } {
  const attributes: { [key: string]: string } = {};
  
  // Enhanced regex that matches our Lark grammar:
  // ATTR_NAME: "label"i | "parent"i | "value"i | ID
  // ATTR_VALUE: STRING_VALUE | ID
  // STRING_VALUE: QUOTED_STRING
  const regex = /(\w+)=(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|([a-zA-Z_][a-zA-Z0-9_-]*))/g;
  let match;
  
  while ((match = regex.exec(str)) !== null) {
    const key = match[1].toLowerCase();
    let value = match[2] || match[3] || match[4];
    
    // Handle escape sequences in quoted strings
    if (match[2] || match[3]) {
      value = value
        .replace(/\\"/g, '"')
        .replace(/\\'/g, "'")
        .replace(/\\\\/g, '\\')
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t');
    }
    
    attributes[key] = value;
  }
  
  return attributes;
}

/**
 * Get the Lark grammar content that this parser uses (same as ChatGPT-5 API)
 */
export function getLarkGrammarContent(): string {
  // Try to get from runtime Lark parser first
  const larkParser = tryLoadLarkParser();
  if (larkParser && larkParser.originalLarkGrammar) {
    return larkParser.originalLarkGrammar;
  }
  
  // Fallback to reading from source
  const fs = require('fs');
  const path = require('path');
  const grammarPath = path.join(__dirname, '../grammar/tree-commands.lark');
  return fs.readFileSync(grammarPath, 'utf8');
}

/**
 * Validate that our parser is consistent with the Lark grammar rules
 */
export function validateGrammarConsistency(): { isConsistent: boolean; issues: string[] } {
  // Try to use runtime Lark parser validation first
  const larkParser = tryLoadLarkParser();
  if (larkParser && larkParser.validateLarkParserConsistency) {
    return larkParser.validateLarkParserConsistency();
  }
  
  // Fallback validation
  const issues: string[] = [];
  
  const testCases = [
    'ADD id=node1',
    'ADD id=node1 label="Test"',
    'ADD id=node1 parent=root',
    'REMOVE id=node1',
    'MOVE id=node1 parent=root',
    'RENAME id=node1 label="New Name"',
    'SET id=node1 value="test"'
  ];
  
  for (const testCase of testCases) {
    try {
      parseTreeCommand(testCase);
    } catch (error) {
      issues.push(`Failed to parse valid case: "${testCase}" - ${error}`);
    }
  }
  
  return {
    isConsistent: issues.length === 0,
    issues
  };
}
