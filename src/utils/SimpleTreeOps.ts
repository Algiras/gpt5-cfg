import { parseTreeCommand, TreeCommand } from './TreeCommandParser';
import { TreeManager } from './SimpleTree';
import { logger } from './logger';

/**
 * Apply a tree command to a JSON tree string
 */
export async function applyTreeCommand(treeJson: string, command: string): Promise<string> {
  const treeManager = new TreeManager();
  
  // Load existing tree or start with empty
  if (treeJson && treeJson.trim() !== '') {
    try {
      treeManager.setTreeJson(treeJson);
    } catch (error) {
      logger.warn('Invalid tree JSON, starting with empty tree', { 
      error: error instanceof Error ? error.message : String(error),
      command 
    });
    }
  }

  // Parse the command
  let parsedCommand: TreeCommand;
  try {
    parsedCommand = parseTreeCommand(command);
  } catch (error) {
    throw new Error(`Invalid command: ${error}`);
  }

  // Apply the command
  try {
    switch (parsedCommand.type) {
      case 'ADD':
        const { id, label, parent, ...otherAttributes } = parsedCommand;
        treeManager.addNode(id, label, parent, otherAttributes);
        break;

      case 'REMOVE':
        const { id: removeId } = parsedCommand;
        const removed = treeManager.removeNode(removeId);
        if (!removed) {
          throw new Error(`Node not found: ${removeId}`);
        }
        break;

      case 'MOVE':
        const { id: moveId, parent: newParent } = parsedCommand;
        treeManager.moveNode(moveId, newParent!);
        break;

      case 'RENAME':
        const { id: renameId, label: newLabel } = parsedCommand;
        treeManager.renameNode(renameId, newLabel!);
        break;

      case 'SET':
        const { id: setId, attr, ...allAttributes } = parsedCommand;
        const attributes: Record<string, any> = {};
        
        // Handle the old SET format: SET id=node attr=attrName value=attrValue
        if (attr && allAttributes.value !== undefined) {
          attributes[attr] = allAttributes.value;
        }
        
        // Handle direct attribute setting: SET id=node attrName=attrValue
        Object.keys(allAttributes).forEach(key => {
          if (!['type', 'id', 'attr'].includes(key)) {
            attributes[key] = allAttributes[key];
          }
        });
        
        treeManager.setNodeAttributes(setId, attributes);
        break;

      default:
        throw new Error(`Unknown command type: ${parsedCommand.type}`);
    }
  } catch (error) {
    throw error;
  }

  return treeManager.getTreeJson();
}

/**
 * Format tree for display
 */
export function formatTreeForDisplay(treeJson: string): string {
  const treeManager = new TreeManager();
  
  if (treeJson && treeJson.trim() !== '') {
    try {
      treeManager.setTreeJson(treeJson);
    } catch (error) {
      return 'Invalid tree format';
    }
  }
  
  return treeManager.formatForDisplay();
}

/**
 * Get tree statistics
 */
export function getTreeStats(treeJson: string): { nodeCount: number; maxDepth: number; leafCount: number } {
  const treeManager = new TreeManager();
  
  if (treeJson && treeJson.trim() !== '') {
    try {
      treeManager.setTreeJson(treeJson);
      return treeManager.getStats();
    } catch (error) {
      // Return empty stats for invalid tree
    }
  }
  
  return { nodeCount: 0, maxDepth: 0, leafCount: 0 };
}
