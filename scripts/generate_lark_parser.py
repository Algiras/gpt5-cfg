#!/usr/bin/env python3
"""
Generate a JavaScript Lark parser directly to dist folder
This ensures we have a proper Lark parser at runtime without cluttering the source
"""

import os
import sys
import json
from pathlib import Path

def read_lark_grammar(grammar_path):
    """Read the Lark grammar file"""
    try:
        with open(grammar_path, 'r', encoding='utf-8') as f:
            return f.read()
    except FileNotFoundError:
        print(f"Error: Grammar file not found: {grammar_path}")
        sys.exit(1)

def generate_simple_lark_parser(grammar_content):
    """Generate a simple JavaScript parser that follows Lark grammar rules"""
    
    js_code = f'''/**
 * Runtime Lark parser generated from tree-commands.lark
 * This file is generated during build - DO NOT EDIT
 * 
 * Original Lark grammar:
{chr(10).join(f" * {line}" for line in grammar_content.split(chr(10)))}
 */

export interface ParsedTreeCommand {{
  type: 'ADD' | 'REMOVE' | 'MOVE' | 'RENAME' | 'SET';
  id: string;
  label?: string;
  parent?: string;
  value?: string;
  attr?: string;
  [key: string]: any;
}}

/**
 * Parse tree command using Lark grammar rules
 */
export function parseLarkTreeCommand(commandString: string): ParsedTreeCommand {{
  const cmd = commandString.trim();
  
  // Extract command type (case insensitive, following Lark grammar)
  const commandMatch = cmd.match(/^(ADD|REMOVE|MOVE|RENAME|SET)\\s+/i);
  if (!commandMatch) {{
    throw new Error('Invalid command format - must start with ADD, REMOVE, MOVE, RENAME, or SET');
  }}
  
  const commandType = commandMatch[1].toUpperCase() as ParsedTreeCommand['type'];
  const remainder = cmd.slice(commandMatch[0].length);
  
  // Parse according to Lark grammar rules for each command type
  switch (commandType) {{
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
      throw new Error(`Unknown command type: ${{commandType}}`);
  }}
}}

// Grammar rule: add_cmd: "ADD"i WS "id=" ID (WS attribute)*
function parseAddCommand(remainder: string, type: ParsedTreeCommand['type']): ParsedTreeCommand {{
  const result: ParsedTreeCommand = {{ type, id: '' }};
  
  if (!remainder.startsWith('id=')) {{
    throw new Error('ADD command must start with id= (following Lark grammar)');
  }}
  
  const attributes = parseAttributes(remainder);
  if (!attributes.id) {{
    throw new Error('ADD command must have id');
  }}
  
  return {{ ...result, ...attributes }};
}}

// Grammar rule: remove_cmd: "REMOVE"i WS "id=" ID
function parseRemoveCommand(remainder: string, type: ParsedTreeCommand['type']): ParsedTreeCommand {{
  const result: ParsedTreeCommand = {{ type, id: '' }};
  
  if (!remainder.startsWith('id=')) {{
    throw new Error('REMOVE command must start with id= (following Lark grammar)');
  }}
  
  const attributes = parseAttributes(remainder);
  if (!attributes.id) {{
    throw new Error('REMOVE command must have id');
  }}
  
  // REMOVE should only have id according to grammar
  const extraAttrs = Object.keys(attributes).filter(k => k !== 'id');
  if (extraAttrs.length > 0) {{
    throw new Error(`REMOVE command should only have id, found: ${{extraAttrs.join(', ')}}`);
  }}
  
  return {{ ...result, ...attributes }};
}}

// Grammar rule: move_cmd: "MOVE"i WS "id=" ID WS "parent=" ID  
function parseMoveCommand(remainder: string, type: ParsedTreeCommand['type']): ParsedTreeCommand {{
  const result: ParsedTreeCommand = {{ type, id: '' }};
  
  if (!remainder.startsWith('id=')) {{
    throw new Error('MOVE command must start with id= (following Lark grammar)');
  }}
  
  const attributes = parseAttributes(remainder);
  if (!attributes.id || !attributes.parent) {{
    throw new Error('MOVE command must have both id and parent (following Lark grammar)');
  }}
  
  return {{ ...result, ...attributes }};
}}

// Grammar rule: rename_cmd: "RENAME"i WS "id=" ID WS "label=" STRING_VALUE
function parseRenameCommand(remainder: string, type: ParsedTreeCommand['type']): ParsedTreeCommand {{
  const result: ParsedTreeCommand = {{ type, id: '' }};
  
  if (!remainder.startsWith('id=')) {{
    throw new Error('RENAME command must start with id= (following Lark grammar)');
  }}
  
  const attributes = parseAttributes(remainder);
  if (!attributes.id || !attributes.label) {{
    throw new Error('RENAME command must have both id and label (following Lark grammar)');
  }}
  
  return {{ ...result, ...attributes }};
}}

// Grammar rule: set_cmd: "SET"i WS "id=" ID (WS attribute)+
function parseSetCommand(remainder: string, type: ParsedTreeCommand['type']): ParsedTreeCommand {{
  const result: ParsedTreeCommand = {{ type, id: '' }};
  
  if (!remainder.startsWith('id=')) {{
    throw new Error('SET command must start with id= (following Lark grammar)');
  }}
  
  const attributes = parseAttributes(remainder);
  if (!attributes.id) {{
    throw new Error('SET command must have id');
  }}
  
  // SET must have at least one attribute besides id according to grammar
  const extraAttrs = Object.keys(attributes).filter(k => k !== 'id');
  if (extraAttrs.length === 0) {{
    throw new Error('SET command must have at least one attribute to set (following Lark grammar)');
  }}
  
  return {{ ...result, ...attributes }};
}}

// Parse attributes following Lark grammar: attribute: ATTR_NAME "=" ATTR_VALUE
// ATTR_NAME: "label"i | "parent"i | "value"i | ID
// ATTR_VALUE: STRING_VALUE | ID  
// STRING_VALUE: QUOTED_STRING
function parseAttributes(str: string): {{ [key: string]: string }} {{
  const attributes: {{ [key: string]: string }} = {{}};
  
  // Regex that matches Lark grammar rules for attributes
  const regex = /(\\w+)=(?:"([^"]*)"|'([^']*)'|([a-zA-Z_][a-zA-Z0-9_-]*))/g;
  let match;
  
  while ((match = regex.exec(str)) !== null) {{
    const key = match[1].toLowerCase();
    let value = match[2] || match[3] || match[4];
    
    // Handle escape sequences in quoted strings (STRING_VALUE handling)
    if (match[2] || match[3]) {{
      value = value
        .replace(/\\\\"/g, '"')
        .replace(/\\\\'/g, "'")
        .replace(/\\\\\\\\/g, '\\\\')
        .replace(/\\\\n/g, '\\n')
        .replace(/\\\\r/g, '\\r')
        .replace(/\\\\t/g, '\\t');
    }}
    
    attributes[key] = value;
  }}
  
  return attributes;
}}

/**
 * Export the original Lark grammar for reference
 */
export const originalLarkGrammar = `''' + grammar_content.replace('`', '\\`').replace('${', '\\${') + '''`;

/**
 * Validate parser consistency with Lark grammar
 */
export function validateLarkParserConsistency(): {{ isConsistent: boolean; issues: string[] }} {{
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
  
  for (const testCase of testCases) {{
    try {{
      parseLarkTreeCommand(testCase);
    }} catch (error) {{
      issues.push(`Failed to parse valid case: "${{testCase}}" - ${{error}}`);
    }}
  }}
  
  return {{
    isConsistent: issues.length === 0,
    issues
  }};
}}
'''
    
    return js_code

def main():
    """Generate the Lark parser to dist folder"""
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    
    # Paths
    grammar_path = project_root / "src" / "grammar" / "tree-commands.lark"
    output_path = project_root / "dist" / "LarkParser.js"
    
    print(f"Reading Lark grammar from: {grammar_path}")
    print(f"Generating runtime parser to: {output_path}")
    
    # Read grammar
    grammar_content = read_lark_grammar(grammar_path)
    
    # Generate JavaScript parser
    js_code = generate_simple_lark_parser(grammar_content)
    
    # Ensure output directory exists
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    # Write the generated parser
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(js_code)
    
    print(f"✅ Generated runtime Lark parser: {output_path}")
    print("🔍 Parser will be available at runtime in dist/LarkParser.js")

if __name__ == "__main__":
    main()
