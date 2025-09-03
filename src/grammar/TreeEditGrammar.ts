import * as fs from 'fs';
import * as path from 'path';

export function getTreeEditLarkGrammar(): string {
  // Read the exact same Lark grammar file that we use for local parsing
  const grammarPath = path.join(__dirname, 'tree-commands.lark');
  try {
    return fs.readFileSync(grammarPath, 'utf8');
  } catch (error) {
    throw new Error(`Failed to read Lark grammar file: ${error}`);
  }
}


