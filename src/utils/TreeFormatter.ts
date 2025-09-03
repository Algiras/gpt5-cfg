import * as xml2js from 'xml2js';

type NodeObj = {
  $?: { id?: string; label?: string; [k: string]: any };
  node?: NodeObj[];
  _?: string;
};

type TreeObj = { tree: { node?: NodeObj[] } };

/**
 * Format XML tree into a nice visual representation
 */
export async function formatTreeForDisplay(xml: string): Promise<string> {
  if (!xml || xml.trim() === '<tree></tree>') {
    return 'Empty Tree\n+-- (add nodes with "Add node id=mynode label=\'My Node\'")\n';
  }

  try {
    const parser = new xml2js.Parser({ 
      explicitArray: false, 
      mergeAttrs: false, 
      explicitCharkey: true, 
      charkey: '_',
      ignoreAttrs: false,
      trim: true
    });

    const obj: TreeObj = await parser.parseStringPromise(xml);
    if (!obj.tree) return 'Invalid Tree Structure\n';

    let result = 'Tree Structure\n';
    if (obj.tree.node) {
      const nodes = Array.isArray(obj.tree.node) ? obj.tree.node : [obj.tree.node];
      nodes.forEach((node, index) => {
        const isLast = index === nodes.length - 1;
        result += formatNode(node, '', isLast);
      });
    } else {
      result += '+-- (empty)\n';
    }
    
    return result;
  } catch (error) {
    return `Tree (raw)\n${xml}\n\n[ERROR] Parse error: ${error}\n`;
  }
}

function formatNode(node: NodeObj, prefix: string, isLast: boolean): string {
  const connector = isLast ? '+-- ' : '+-- ';
  const id = node.$?.id || 'no-id';
  const label = node.$?.label || node._ || '';
  
  let result = `${prefix}${connector}${id}`;
  if (label && label !== id) {
    result += ` ("${label}")`;
  }
  
  // Add any other attributes
  if (node.$) {
    const otherAttrs = Object.keys(node.$)
      .filter(key => key !== 'id' && key !== 'label')
      .map(key => `${key}=${node.$![key]}`)
      .join(' ');
    if (otherAttrs) {
      result += ` [${otherAttrs}]`;
    }
  }
  
  result += '\n';
  
  // Add children
  if (node.node) {
    const children = Array.isArray(node.node) ? node.node : [node.node];
    const childPrefix = prefix + (isLast ? '    ' : '|   ');
    children.forEach((child, index) => {
      const isLastChild = index === children.length - 1;
      result += formatNode(child, childPrefix, isLastChild);
    });
  }
  
  return result;
}

/**
 * Get tree statistics
 */
export async function getTreeStats(xml: string): Promise<{ nodeCount: number; maxDepth: number; leafCount: number }> {
  if (!xml || xml.trim() === '<tree></tree>') {
    return { nodeCount: 0, maxDepth: 0, leafCount: 0 };
  }

  try {
    const parser = new xml2js.Parser({ 
      explicitArray: false, 
      mergeAttrs: false, 
      explicitCharkey: true, 
      charkey: '_',
      ignoreAttrs: false,
      trim: true
    });

    const obj: TreeObj = await parser.parseStringPromise(xml);
    if (!obj.tree?.node) return { nodeCount: 0, maxDepth: 0, leafCount: 0 };

    const nodes = Array.isArray(obj.tree.node) ? obj.tree.node : [obj.tree.node];
    let nodeCount = 0;
    let maxDepth = 0;
    let leafCount = 0;

    function countNodes(node: NodeObj, depth: number = 1): void {
      nodeCount++;
      maxDepth = Math.max(maxDepth, depth);
      
      if (!node.node || (Array.isArray(node.node) && node.node.length === 0)) {
        leafCount++;
      } else {
        const children = Array.isArray(node.node) ? node.node : [node.node];
        children.forEach(child => countNodes(child, depth + 1));
      }
    }

    nodes.forEach(node => countNodes(node));
    return { nodeCount, maxDepth, leafCount };
  } catch {
    return { nodeCount: 0, maxDepth: 0, leafCount: 0 };
  }
}
