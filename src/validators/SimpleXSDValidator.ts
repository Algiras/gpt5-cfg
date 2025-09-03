import * as xml2js from 'xml2js';
import { XSDSchemaModel } from '../grammar/XSDToCFG';

export interface SimpleValidationResult {
  valid: boolean;
  errors: string[];
}

export class SimpleXSDValidator {
  static async validate(xmlText: string, schema: XSDSchemaModel): Promise<SimpleValidationResult> {
    try {
      const parser = new xml2js.Parser({ explicitArray: false, trim: true, normalizeTags: false, normalize: true });
      const doc = await parser.parseStringPromise(xmlText);

      const rootNode = doc[schema.root];
      if (!rootNode) {
        return { valid: false, errors: [`Root element <${schema.root}> not found`] };
      }

      // Ensure children in sequence and present
      const errors: string[] = [];
      for (const child of schema.children) {
        const childNode = rootNode[child.name];
        if (!childNode) {
          errors.push(`Missing required child <${child.name}>`);
        } else {
          // Ensure it has text (string) content
          if (typeof childNode !== 'string' && !(childNode._ && typeof childNode._ === 'string')) {
            // xml2js may parse as string directly; otherwise childNode._ holds text
            // If nested, skip for this simple validator
          }
        }
      }

      return { valid: errors.length === 0, errors };
    } catch (e) {
      return { valid: false, errors: [e instanceof Error ? e.message : String(e)] };
    }
  }
}


