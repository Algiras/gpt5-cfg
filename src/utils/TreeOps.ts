import * as xml2js from 'xml2js';
import { parseAndValidateTreeCommand, TreeCommand } from './TreeCommandParser';

type NodeObj = {
  $?: { id?: string; label?: string; [k: string]: any };
  node?: NodeObj[];
  _: string;
};

type TreeObj = { tree: { node?: NodeObj[] } };

export async function applyTreeCommand(xml: string, command: string): Promise<string> {
  const parser = new xml2js.Parser({ 
    explicitArray: false, 
    mergeAttrs: false, 
    explicitCharkey: true, 
    charkey: '_',
    ignoreAttrs: false,
    trim: true
  });
  const builder = new xml2js.Builder({ headless: true });
  let obj: TreeObj;
  try {
    obj = await parser.parseStringPromise(xml || '<tree></tree>');
  } catch (e) {
    obj = { tree: {} } as any;
  }
  if (!obj.tree) obj.tree = {} as any;

  // Parse the command using our robust Peggy parser
  let parsedCommand: TreeCommand;
  try {
    parsedCommand = parseAndValidateTreeCommand(command);
  } catch (error) {
    throw new Error(`Invalid command: ${error}`);
  }

  try {
    if (parsedCommand.type === 'ADD') {
      const { id, label, parent } = parsedCommand;
      
      const newNode: NodeObj = { $: { id, label }, _: label || '' };
      ensureArrayTree(obj);
      
      if (parent) {
        const p = findNode(obj.tree.node!, parent);
        if (!p) {
          throw new Error(`Parent not found: ${parent}`);
        }
        if (!p.node) p.node = [];
        if (!Array.isArray(p.node)) p.node = [p.node];
        p.node.push(newNode);
      } else {
        obj.tree.node!.push(newNode);
      }
    } else if (parsedCommand.type === 'REMOVE') {
      const { id } = parsedCommand;
      removeNode(obj, id);
      
    } else if (parsedCommand.type === 'MOVE') {
      const { id, parent } = parsedCommand;
      const node = detachNode(obj, id);
      if (!node) throw new Error(`Node not found: ${id}`);
      ensureArrayTree(obj);
      const p = findNode(obj.tree.node!, parent!);
      if (!p) throw new Error(`Parent not found: ${parent}`);
      if (!p.node) p.node = [];
      p.node.push(node);
      
    } else if (parsedCommand.type === 'RENAME') {
      const { id, label } = parsedCommand;
      const node = findNode(obj.tree.node as any, id);
      if (!node) throw new Error(`Node not found: ${id}`);
      node.$ = node.$ || {};
      node.$.label = label;
      node._ = label || '';
      
    } else if (parsedCommand.type === 'SET') {
      const { id, attr, value, ...otherAttributes } = parsedCommand;
      const node = findNode(obj.tree.node as any, id);
      if (!node) throw new Error(`Node not found: ${id}`);
      node.$ = node.$ || {};
      
      // Handle the old SET format: SET id=node attr=attrName value=attrValue
      if (attr && value !== undefined) {
        (node.$ as any)[attr] = value;
      }
      
      // Handle direct attribute setting: SET id=node attrName=attrValue
      Object.keys(otherAttributes).forEach(key => {
        if (key !== 'type' && key !== 'attr' && key !== 'value') {
          (node.$ as any)[key] = otherAttributes[key];
        }
      });
      
    } else {
      throw new Error(`Unknown command type: ${parsedCommand.type}`);
    }
  } catch (e) {
    throw e;
  }

  const normalized = normalizeTree(obj);
  const result = builder.buildObject(normalized);
  
  return result;
}

function ensureArrayTree(obj: TreeObj) {
  if (!obj.tree.node) obj.tree.node = [];
  if (!Array.isArray(obj.tree.node)) obj.tree.node = [obj.tree.node as any];
}

function findNode(nodes: NodeObj[] | NodeObj | undefined, id: string): NodeObj | undefined {
  if (!nodes) return undefined;
  const nodeArray = asArray(nodes);
  for (const n of nodeArray) {
    if (n.$?.id === id) return n;
    const f = findNode(n.node, id);
    if (f) return f;
  }
  return undefined;
}

function removeNode(obj: TreeObj, id: string): boolean {
  if (!obj.tree.node) return false;
  const removed = removeFromList(obj.tree, 'node', id);
  if (removed) return true;
  for (const n of asArray(obj.tree.node)) {
    if (n.node && removeFromList(n, 'node', id)) return true;
  }
  return false;
}

function detachNode(obj: TreeObj, id: string): NodeObj | undefined {
  if (!obj.tree.node) return undefined;
  const node = detachFromList(obj.tree, 'node', id);
  if (node) return node;
  for (const n of asArray(obj.tree.node)) {
    if (!n.node) continue;
    const c = detachFromList(n, 'node', id);
    if (c) return c;
  }
  return undefined;
}

function removeFromList(parent: any, key: string, id: string): boolean {
  const arr = asArray(parent[key]);
  const idx = arr.findIndex((n: NodeObj) => n.$?.id === id);
  if (idx >= 0) {
    arr.splice(idx, 1);
    parent[key] = arr;
    return true;
  }
  for (const n of arr) {
    if (n.node && removeFromList(n, 'node', id)) return true;
  }
  return false;
}

function detachFromList(parent: any, key: string, id: string): NodeObj | undefined {
  const arr = asArray(parent[key]);
  const idx = arr.findIndex((n: NodeObj) => n.$?.id === id);
  if (idx >= 0) {
    const [node] = arr.splice(idx, 1);
    parent[key] = arr;
    return node;
  }
  for (const n of arr) {
    if (n.node) {
      const c = detachFromList(n, 'node', id);
      if (c) return c;
    }
  }
  return undefined;
}

function asArray<T>(v: T | T[] | undefined): T[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

function normalizeTree(obj: TreeObj): any {
  // Ensure arrays are arrays; xml2js builder handles both
  return obj;
}


