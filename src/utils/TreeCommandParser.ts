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
 * Parse a tree command string using the runtime Lark parser
 * 
 * This function uses the same Lark grammar that ChatGPT-5 API uses, ensuring 100% consistency.
 * The process:
 * 1. Load the Lark.js generated parser module (from dist/LarkParser.js)
 * 2. Create a parser instance with our custom transformer
 * 3. Parse the command string and transform it to TreeCommand format
 * 
 * @param commandString - The command string to parse (e.g., "ADD id=node1 label='My Node'")
 * @returns Parsed command object or throws an error if parsing fails
 */
export function parseTreeCommand(commandString: string): TreeCommand {
  try {
    const larkModule = loadLarkParserModule();
    const parser = larkModule.get_parser({ transformer: createTreeCommandTransformer() });
    const result = parser.parse(commandString.trim());
    
    // The transformer should have converted this to our expected format
    if (result && typeof result === 'object' && result.type) {
      return result as TreeCommand;
    }
    
    throw new Error(`Parser returned unexpected format: ${JSON.stringify(result)}`);
  } catch (error) {
    throw new Error(`Failed to parse tree command: "${commandString}". ${error}`);
  }
}

/**
 * Create transformer for converting Lark parse tree to TreeCommand format
 * This transformer maps Lark grammar rules to our TreeCommand objects
 */
function createTreeCommandTransformer() {
  return {
    // Transform the top-level start rule to extract the command
    start: (children: any[]) => {
      return children[0];
    },
    
    // Transform the command rule to extract the specific command type
    command: (children: any[]) => {
      return children[0];
    },
    
    // Transform command nodes
    add_cmd: (children: any[]) => {
      const result: TreeCommand = { type: 'ADD', id: '' };
      extractAttributesFromChildren(children, result);
      return result;
    },
    
    remove_cmd: (children: any[]) => {
      const result: TreeCommand = { type: 'REMOVE', id: '' };
      extractAttributesFromChildren(children, result);
      return result;
    },
    
    move_cmd: (children: any[]) => {
      const result: TreeCommand = { type: 'MOVE', id: '' };
      extractAttributesFromChildren(children, result);
      return result;
    },
    
    rename_cmd: (children: any[]) => {
      const result: TreeCommand = { type: 'RENAME', id: '' };
      extractAttributesFromChildren(children, result);
      return result;
    },
    
    set_cmd: (children: any[]) => {
      const result: TreeCommand = { type: 'SET', id: '' };
      extractAttributesFromChildren(children, result);
      return result;
    },
    
    // Transform attribute nodes into key-value pairs
    attribute: (children: any[]) => {
      if (children.length >= 2) {
        const nameToken = children[0];
        const valueToken = children[1];
        
        let name = nameToken.value || nameToken;
        // Normalize attribute names to lowercase
        name = name.toLowerCase();
        
        const value = cleanValue(valueToken.value || valueToken);
        
        return { name, value };
      }
      return null;
    }
  };
}

/**
 * Extract attributes from parse tree children
 */
function extractAttributesFromChildren(children: any[], result: TreeCommand) {
  children.forEach(child => {
    if (child && typeof child === 'object') {
      // Handle tokens directly
      if (child.type === 'ID') {
        if (!result.id) {
          result.id = child.value;
        } else if (result.type === 'MOVE' && !result.parent) {
          // Second ID in MOVE command is the parent
          result.parent = child.value;
        }
      } else if (child.type === 'STRING_VALUE') {
        const cleanVal = cleanValue(child.value);
        if (result.type === 'RENAME' && !result.label) {
          result.label = cleanVal;
        } else if (result.type === 'SET' && !result.value) {
          result.value = cleanVal;
        }
      } else if (child.name && child.value !== undefined) {
        // This is a transformed attribute from our transformer
        (result as any)[child.name] = child.value;
      }
    }
  });
}

/**
 * Clean quoted values and handle escapes
 */
function cleanValue(value: any): string {
  if (typeof value === 'string' && value.length >= 2) {
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      let cleaned = value.slice(1, -1);
      // Unescape common escape sequences
      cleaned = cleaned.replace(/\\"/g, '"').replace(/\\'/g, "'").replace(/\\\\/g, '\\');
      return cleaned;
    }
  }
  return value;
}

/**
 * Load the runtime Lark parser module from dist folder
 * @returns The Lark parser module with get_parser function
 * @throws Error if parser is not available
 */
function loadLarkParserModule(): any {
  const path = require('path');
  
  // Try multiple paths to find the parser
  const possiblePaths = [
    // When running from dist/utils (after compilation)
    path.join(__dirname, '../LarkParser.js'),
    // When running from src/utils (during tests)
    path.join(__dirname, '../../dist/LarkParser.js'),
    // Absolute path from project root
    path.join(process.cwd(), 'dist/LarkParser.js')
  ];
  
  for (const larkParserPath of possiblePaths) {
    try {
      return require(larkParserPath);
    } catch (error) {
      // Continue trying other paths
      continue;
    }
  }
  
  throw new Error(
    'Lark parser not available. Please run "npm run build" to generate the runtime parser. ' +
    `Tried paths: ${possiblePaths.join(', ')}`
  );
}

/**
 * Get the Lark grammar content that this parser uses (same as ChatGPT-5 API)
 */
export function getLarkGrammarContent(): string {
  try {
    // Try to get from runtime Lark parser first
    const larkParser = loadLarkParserModule();
    if (larkParser && larkParser.originalLarkGrammar) {
      return larkParser.originalLarkGrammar;
    }
  } catch (error) {
    // Fallback to reading from source if runtime parser not available
  }
  
  // Fallback to reading from source
  const fs = require('fs');
  const path = require('path');
  const grammarPath = path.join(__dirname, '../grammar/tree-commands.lark');
  return fs.readFileSync(grammarPath, 'utf8');
}
