export interface TreeCommand {
  type: 'ADD' | 'REMOVE' | 'MOVE' | 'RENAME' | 'SET';
  id: string;
  label?: string;
  parent?: string;
  value?: string;
  [key: string]: any;
}

/**
 * Parse a tree command string using a robust regex-based parser that follows our Lark grammar
 * @param commandString - The command string to parse (e.g., "ADD id=node1 label='My Node'")
 * @returns Parsed command object or throws an error if parsing fails
 */
export function parseTreeCommand(commandString: string): TreeCommand {
  const cmd = commandString.trim();
  
  // Match command type (case insensitive)
  const commandMatch = cmd.match(/^(ADD|REMOVE|MOVE|RENAME|SET)\s+/i);
  if (!commandMatch) {
    throw new Error(`Invalid command format: "${cmd}"`);
  }
  
  const commandType = commandMatch[1].toUpperCase() as TreeCommand['type'];
  const remainder = cmd.slice(commandMatch[0].length);
  
  // Parse attributes using a more robust approach
  const attributes = parseAttributes(remainder);
  
  if (!attributes.id) {
    throw new Error(`Command must have an id: "${cmd}"`);
  }
  
  const result: TreeCommand = {
    type: commandType,
    id: attributes.id,
    ...attributes
  };
  
  // Remove the id from additional attributes since it's already in the base
  delete (result as any).id;
  result.id = attributes.id;
  
  return result;
}

/**
 * Parse attribute pairs like id=value label="quoted value" parent=nodeId
 * Handles escaped quotes and various formats
 */
function parseAttributes(str: string): { [key: string]: string } {
  const attributes: { [key: string]: string } = {};
  
  // More sophisticated regex that handles escaped quotes
  const regex = /(\w+)=(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|(\S+))/g;
  let match;
  
  while ((match = regex.exec(str)) !== null) {
    const key = match[1].toLowerCase(); // Normalize attribute names to lowercase
    let value = match[2] || match[3] || match[4]; // quoted or unquoted value
    
    // Handle escaped characters in quoted strings
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
 * Validate that a parsed command has required fields
 * @param command - The parsed command object
 * @throws Error if validation fails
 */
export function validateTreeCommand(command: TreeCommand): void {
  if (!command.type) {
    throw new Error('Command must have a type');
  }
  
  if (!command.id) {
    throw new Error('Command must have an id');
  }
  
  // Type-specific validation
  switch (command.type) {
    case 'ADD':
      // ADD commands are valid with just id, label and parent are optional
      break;
    case 'REMOVE':
      // REMOVE commands only need id
      break;
    case 'MOVE':
      if (!command.parent) {
        throw new Error('MOVE command must have a parent');
      }
      break;
    case 'RENAME':
      if (!command.label) {
        throw new Error('RENAME command must have a label');
      }
      break;
    case 'SET':
      // SET commands need at least one attribute besides type and id
      const attrs = Object.keys(command).filter(key => !['type', 'id'].includes(key));
      if (attrs.length === 0) {
        throw new Error('SET command must have at least one attribute to set');
      }
      break;
    default:
      throw new Error(`Unknown command type: ${command.type}`);
  }
}

/**
 * Parse and validate a tree command string
 * @param commandString - The command string to parse
 * @returns Validated parsed command object
 */
export function parseAndValidateTreeCommand(commandString: string): TreeCommand {
  const command = parseTreeCommand(commandString);
  validateTreeCommand(command);
  return command;
}
