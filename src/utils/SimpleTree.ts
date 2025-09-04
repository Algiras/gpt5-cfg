/**
 * Simple JSON-based tree structure to replace XML
 */

import { logger } from './logger';

export interface TreeNode {
  id: string;
  label?: string;
  children: TreeNode[];
  [key: string]: any; // Allow additional attributes
}

export interface SimpleTree {
  nodes: TreeNode[];
}

export class TreeManager {
  private tree: SimpleTree;

  constructor() {
    this.tree = { nodes: [] };
  }

  /**
   * Get the current tree as JSON string
   */
  getTreeJson(): string {
    return JSON.stringify(this.tree, null, 2);
  }

  /**
   * Set the tree from JSON string
   */
  setTreeJson(json: string): void {
    try {
      this.tree = JSON.parse(json);
    } catch (error) {
      logger.error('Invalid tree JSON', { 
        error: error instanceof Error ? error.message : String(error),
        jsonString: json.substring(0, 100) + '...' // Log first 100 chars for context
      });
      this.tree = { nodes: [] };
    }
  }

  /**
   * Get the tree object
   */
  getTree(): SimpleTree {
    return this.tree;
  }

  /**
   * Add a node to the tree
   */
  addNode(id: string, label?: string, parentId?: string, attributes: Record<string, any> = {}): void {
    const newNode: TreeNode = {
      id,
      label,
      children: [],
      ...attributes
    };

    if (!parentId) {
      // Add to root level
      this.tree.nodes.push(newNode);
    } else if (parentId === 'root') {
      // Special case: if parent is 'root', try to find a node with id='root'
      const rootNode = this.findNode('root');
      if (rootNode) {
        rootNode.children.push(newNode);
      } else {
        // If no root node exists, add to root level
        this.tree.nodes.push(newNode);
      }
    } else {
      // Find parent and add as child
      const parent = this.findNode(parentId);
      if (!parent) {
        throw new Error(`Parent not found: ${parentId}`);
      }
      parent.children.push(newNode);
    }
  }

  /**
   * Remove a node from the tree
   */
  removeNode(id: string): boolean {
    return this.removeNodeFromArray(this.tree.nodes, id);
  }

  private removeNodeFromArray(nodes: TreeNode[], id: string): boolean {
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].id === id) {
        nodes.splice(i, 1);
        return true;
      }
      if (this.removeNodeFromArray(nodes[i].children, id)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Move a node to a new parent
   */
  moveNode(id: string, newParentId: string): void {
    // First remove the node
    const node = this.findAndDetachNode(id);
    if (!node) {
      throw new Error(`Node not found: ${id}`);
    }

    // Add to new parent
    if (!newParentId || newParentId === 'root') {
      this.tree.nodes.push(node);
    } else {
      const parent = this.findNode(newParentId);
      if (!parent) {
        throw new Error(`Parent not found: ${newParentId}`);
      }
      parent.children.push(node);
    }
  }

  /**
   * Rename a node
   */
  renameNode(id: string, newLabel: string): void {
    const node = this.findNode(id);
    if (!node) {
      throw new Error(`Node not found: ${id}`);
    }
    node.label = newLabel;
  }

  /**
   * Set attributes on a node
   */
  setNodeAttributes(id: string, attributes: Record<string, any>): void {
    const node = this.findNode(id);
    if (!node) {
      throw new Error(`Node not found: ${id}`);
    }
    Object.assign(node, attributes);
  }

  /**
   * Find a node by ID
   */
  findNode(id: string): TreeNode | null {
    return this.findNodeInArray(this.tree.nodes, id);
  }

  private findNodeInArray(nodes: TreeNode[], id: string): TreeNode | null {
    for (const node of nodes) {
      if (node.id === id) {
        return node;
      }
      const found = this.findNodeInArray(node.children, id);
      if (found) {
        return found;
      }
    }
    return null;
  }

  /**
   * Find and detach a node (remove it and return it)
   */
  private findAndDetachNode(id: string): TreeNode | null {
    return this.findAndDetachFromArray(this.tree.nodes, id);
  }

  private findAndDetachFromArray(nodes: TreeNode[], id: string): TreeNode | null {
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].id === id) {
        return nodes.splice(i, 1)[0];
      }
      const found = this.findAndDetachFromArray(nodes[i].children, id);
      if (found) {
        return found;
      }
    }
    return null;
  }

  /**
   * Reset tree to empty state
   */
  reset(): void {
    this.tree = { nodes: [] };
  }

  /**
   * Get tree statistics
   */
  getStats(): { nodeCount: number; maxDepth: number; leafCount: number } {
    const nodeCount = this.countNodes(this.tree.nodes);
    const maxDepth = this.getMaxDepth(this.tree.nodes, 0);
    const leafCount = this.countLeaves(this.tree.nodes);
    
    return { nodeCount, maxDepth, leafCount };
  }

  private countNodes(nodes: TreeNode[]): number {
    let count = nodes.length;
    for (const node of nodes) {
      count += this.countNodes(node.children);
    }
    return count;
  }

  private getMaxDepth(nodes: TreeNode[], currentDepth: number): number {
    if (nodes.length === 0) return currentDepth;
    
    let maxDepth = currentDepth;
    for (const node of nodes) {
      const childDepth = this.getMaxDepth(node.children, currentDepth + 1);
      maxDepth = Math.max(maxDepth, childDepth);
    }
    return maxDepth;
  }

  private countLeaves(nodes: TreeNode[]): number {
    let count = 0;
    for (const node of nodes) {
      if (node.children.length === 0) {
        count++;
      } else {
        count += this.countLeaves(node.children);
      }
    }
    return count;
  }

  /**
   * Format tree for display
   */
  formatForDisplay(): string {
    if (this.tree.nodes.length === 0) {
      return 'Empty Tree\n\nTree Structure:\n(no nodes)';
    }

    const stats = this.getStats();
    let result = `Tree Structure:\n`;
    result += this.formatNodesForDisplay(this.tree.nodes, '', true);
    result += `\n\nStatistics:\n`;
    result += `Nodes: ${stats.nodeCount}\n`;
    result += `Max Depth: ${stats.maxDepth}\n`;
    result += `Leaves: ${stats.leafCount}`;
    
    return result;
  }

  private formatNodesForDisplay(nodes: TreeNode[], prefix: string, isRoot: boolean): string {
    let result = '';
    
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const isLast = i === nodes.length - 1;
      const connector = isLast ? '+-- ' : '+-- ';
      const childPrefix = isLast ? '    ' : '|   ';
      
      const label = node.label ? ` (${node.label})` : '';
      result += `${prefix}${connector}${node.id}${label}\n`;
      
      if (node.children.length > 0) {
        result += this.formatNodesForDisplay(node.children, prefix + childPrefix, false);
      }
    }
    
    return result;
  }
}
