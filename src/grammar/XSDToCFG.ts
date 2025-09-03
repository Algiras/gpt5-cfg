import * as xml2js from 'xml2js';

export interface XSDSchemaModel {
  root: string;
  children: Array<{ name: string; children?: Array<{ name: string }> }>;
}

/**
 * Generate a minimal CFG and schema model from an XSD (supports a subset: root element with sequence of child elements).
 */
export async function generateCFGfromXSD(xsdText: string): Promise<{ cfg: string; schema: XSDSchemaModel }> {
  const parser = new xml2js.Parser({ explicitArray: false, trim: true, normalize: true });
  const xsd = await parser.parseStringPromise(xsdText);

  // Navigate to top-level element definition
  const schema = xsd['xs:schema'] || xsd['xsd:schema'] || xsd.schema || xsd;
  const elements = toArray(schema['xs:element'] || schema['element']);
  if (!elements || elements.length === 0) {
    throw new Error('XSD does not define any top-level xs:element');
  }

  const rootEl = elements[0];
  const rootName: string = rootEl.$?.name || 'root';

  // Support: <xs:element name="root"><xs:complexType><xs:sequence> <xs:element name="child"/>* </xs:sequence></xs:complexType></xs:element>
  const complex = rootEl['xs:complexType'] || rootEl['complexType'];
  const seq = complex?.['xs:sequence'] || complex?.sequence;
  const childElements = toArray(seq?.['xs:element'] || seq?.element) || [];
  const childNames = childElements.map((e: any) => e.$?.name).filter(Boolean) as string[];

  const schemaModel: XSDSchemaModel = {
    root: rootName,
    children: childNames.map((n) => ({ name: n }))
  };

  // Build a simple CFG for XML surface form
  const lines: string[] = [];
  lines.push('S -> Root');

  // Detect a recursive node element (e.g., name="node" maxOccurs="unbounded") and emit recursive productions
  const recursiveChild = childElements.find((e: any) => (e.$?.maxOccurs === 'unbounded' || e.$?.maxoccurs === 'unbounded') && typeof e.$?.name === 'string');
  const recursiveName: string | undefined = recursiveChild?.$?.name;

  if (recursiveName) {
    // Root contains zero or more recursive nodes
    lines.push(`Root -> "<${rootName}>" ${recursiveName}List "</${rootName}>"`);
    lines.push(`${recursiveName}List -> ${recursiveName} | ${recursiveName} ${recursiveName}List`);
    lines.push(`${recursiveName} -> "<${recursiveName}>" Text ${recursiveName}Children "</${recursiveName}>"`);
    lines.push(`${recursiveName}Children -> ${recursiveName}List |`);
  } else {
    // Flat children in order
    const rhs = childNames.length > 0 ? childNames.join(' ') : '';
    lines.push(`Root -> "<${rootName}>" ${rhs} "</${rootName}>"`);
    for (const child of childNames) {
      lines.push(`${child} -> "<${child}>" Text "</${child}>"`);
    }
  }

  // Text: anything except '<' and newline, minimally
  lines.push('Text -> /[^<][^<\\n]*/');

  return { cfg: lines.join('\n'), schema: schemaModel };
}

function toArray<T>(v: T | T[] | undefined): T[] | undefined {
  if (!v) return undefined;
  return Array.isArray(v) ? v : [v];
}


