import { applyTreeCommand, formatTreeForDisplay, getTreeStats } from '../utils/SimpleTreeOps';

describe('SimpleTreeOps', () => {
  describe('ADD command', () => {
    it('should add a node to empty tree', async () => {
      const tree = '{"nodes":[]}';
      const command = 'ADD id=root label="Root Node"';
      const result = await applyTreeCommand(tree, command);
      
      const parsed = JSON.parse(result);
      expect(parsed.nodes).toHaveLength(1);
      expect(parsed.nodes[0].id).toBe('root');
      expect(parsed.nodes[0].label).toBe('Root Node');
    });

    it('should add a child node', async () => {
      let tree = '{"nodes":[]}';
      tree = await applyTreeCommand(tree, 'ADD id=root label="Root"');
      tree = await applyTreeCommand(tree, 'ADD id=child1 label="Child" parent=root');
      
      const parsed = JSON.parse(tree);
      expect(parsed.nodes).toHaveLength(1); // Root node
      expect(parsed.nodes[0].children).toHaveLength(1); // Child node
      expect(parsed.nodes[0].children[0].id).toBe('child1');
    });

    it('should add node without label', async () => {
      const tree = '{"nodes":[]}';
      const command = 'ADD id=node1';
      const result = await applyTreeCommand(tree, command);
      
      const parsed = JSON.parse(result);
      expect(parsed.nodes[0].id).toBe('node1');
      expect(parsed.nodes[0].label).toBeUndefined();
    });
  });

  describe('REMOVE command', () => {
    it('should remove a node', async () => {
      let tree = '{"nodes":[]}';
      tree = await applyTreeCommand(tree, 'ADD id=root label="Root"');
      tree = await applyTreeCommand(tree, 'ADD id=child1 label="Child" parent=root');
      tree = await applyTreeCommand(tree, 'REMOVE id=child1');
      
      const parsed = JSON.parse(tree);
      expect(parsed.nodes[0].children).toHaveLength(0);
    });

    it('should throw error for non-existent node', async () => {
      const tree = '{"nodes":[]}';
      await expect(applyTreeCommand(tree, 'REMOVE id=nonexistent'))
        .rejects.toThrow('Node not found: nonexistent');
    });
  });

  describe('MOVE command', () => {
    it('should move a node to new parent', async () => {
      let tree = '{"nodes":[]}';
      tree = await applyTreeCommand(tree, 'ADD id=root label="Root"');
      tree = await applyTreeCommand(tree, 'ADD id=parent1 label="Parent1" parent=root');
      tree = await applyTreeCommand(tree, 'ADD id=child1 label="Child" parent=root');
      tree = await applyTreeCommand(tree, 'MOVE id=child1 parent=parent1');
      
      const parsed = JSON.parse(tree);
      const parent1 = parsed.nodes[0].children.find((n: any) => n.id === 'parent1');
      expect(parent1.children).toHaveLength(1);
      expect(parent1.children[0].id).toBe('child1');
    });

    it('should move node to root', async () => {
      let tree = '{"nodes":[]}';
      tree = await applyTreeCommand(tree, 'ADD id=root label="Root"');
      tree = await applyTreeCommand(tree, 'ADD id=child1 label="Child" parent=root');
      tree = await applyTreeCommand(tree, 'MOVE id=child1 parent=root');
      
      const parsed = JSON.parse(tree);
      expect(parsed.nodes).toHaveLength(2); // Both root and child1 at root level
    });
  });

  describe('RENAME command', () => {
    it('should rename a node', async () => {
      let tree = '{"nodes":[]}';
      tree = await applyTreeCommand(tree, 'ADD id=node1 label="Old Name"');
      tree = await applyTreeCommand(tree, 'RENAME id=node1 label="New Name"');
      
      const parsed = JSON.parse(tree);
      expect(parsed.nodes[0].label).toBe('New Name');
    });
  });

  describe('SET command', () => {
    it('should set attributes on a node', async () => {
      let tree = '{"nodes":[]}';
      tree = await applyTreeCommand(tree, 'ADD id=node1');
      tree = await applyTreeCommand(tree, 'SET id=node1 value="test" category="custom"');
      
      const parsed = JSON.parse(tree);
      expect(parsed.nodes[0].value).toBe('test');
      expect(parsed.nodes[0].category).toBe('custom');
    });
  });

  describe('formatTreeForDisplay', () => {
    it('should format empty tree', () => {
      const tree = '{"nodes":[]}';
      const result = formatTreeForDisplay(tree);
      expect(result).toContain('Empty Tree');
    });

    it('should format tree with nodes', () => {
      const tree = '{"nodes":[{"id":"root","label":"Root","children":[{"id":"child1","label":"Child","children":[]}]}]}';
      const result = formatTreeForDisplay(tree);
      expect(result).toContain('Tree Structure:');
      expect(result).toContain('root (Root)');
      expect(result).toContain('child1 (Child)');
    });
  });

  describe('getTreeStats', () => {
    it('should return stats for empty tree', () => {
      const tree = '{"nodes":[]}';
      const stats = getTreeStats(tree);
      expect(stats.nodeCount).toBe(0);
      expect(stats.maxDepth).toBe(0);
      expect(stats.leafCount).toBe(0);
    });

    it('should return stats for tree with nodes', () => {
      const tree = '{"nodes":[{"id":"root","label":"Root","children":[{"id":"child1","label":"Child","children":[]}]}]}';
      const stats = getTreeStats(tree);
      expect(stats.nodeCount).toBe(2);
      expect(stats.maxDepth).toBe(2);
      expect(stats.leafCount).toBe(1);
    });
  });
});
