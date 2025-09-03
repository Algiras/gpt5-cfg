import { applyTreeCommand } from '../utils/TreeOps';
import { formatTreeForDisplay, getTreeStats } from '../utils/TreeFormatter';

describe('TreeOps', () => {
  describe('ADD command', () => {
    it('should add a node to empty tree', async () => {
      const xml = '<tree></tree>';
      const command = 'ADD id=root label="Root Node"';
      const result = await applyTreeCommand(xml, command);
      
      expect(result).toContain('<node id="root" label="Root Node">');
      expect(result).toContain('Root Node');
    });

    it('should add a child node to existing parent', async () => {
      const xml = '<tree><node id="root" label="Root">Root</node></tree>';
      const command = 'ADD id=child1 label="Child 1" parent=root';
      const result = await applyTreeCommand(xml, command);
      
      expect(result).toContain('<node id="child1" label="Child 1">');
      expect(result).toContain('Child 1');
    });

    it('should add node without label', async () => {
      const xml = '<tree></tree>';
      const command = 'ADD id=node1';
      const result = await applyTreeCommand(xml, command);
      
      // xml2js creates self-closing tags for empty nodes
      expect(result).toContain('id="node1"');
    });

    it('should throw error when parent not found', async () => {
      const xml = '<tree><node id="root">Root</node></tree>';
      const command = 'ADD id=child1 label="Child" parent=nonexistent';
      
      await expect(applyTreeCommand(xml, command)).rejects.toThrow('Parent not found: nonexistent');
    });

    it('should throw error when id is missing', async () => {
      const xml = '<tree></tree>';
      const command = 'ADD label="No ID"';
      
      await expect(applyTreeCommand(xml, command)).rejects.toThrow('ADD requires id');
    });
  });

  describe('REMOVE command', () => {
    it('should remove a node by id', async () => {
      const xml = '<tree><node id="root">Root</node><node id="remove-me">Remove</node></tree>';
      const command = 'REMOVE id=remove-me';
      const result = await applyTreeCommand(xml, command);
      
      expect(result).not.toContain('remove-me');
      expect(result).toContain('<node id="root">');
    });

    it('should remove nested node', async () => {
      const xml = `<tree>
        <node id="root">
          Root
          <node id="child1">Child 1</node>
          <node id="child2">Child 2</node>
        </node>
      </tree>`;
      const command = 'REMOVE id=child1';
      const result = await applyTreeCommand(xml, command);
      
      expect(result).not.toContain('child1');
      expect(result).toContain('child2');
    });

    it('should throw error when id is missing', async () => {
      const xml = '<tree><node id="root">Root</node></tree>';
      const command = 'REMOVE';
      
      await expect(applyTreeCommand(xml, command)).rejects.toThrow('REMOVE requires id');
    });
  });

  describe('MOVE command', () => {
    it('should move a node to new parent', async () => {
      const xml = `<tree>
        <node id="parent1">
          Parent 1
          <node id="child">Child</node>
        </node>
        <node id="parent2">Parent 2</node>
      </tree>`;
      const command = 'MOVE id=child parent=parent2';
      const result = await applyTreeCommand(xml, command);
      
      // Child should now be under parent2
      expect(result).toMatch(/<node id="parent2">.*<node id="child">/s);
      // Child should not be under parent1 anymore (parent1 should just have "Parent 1" text)
      const parent1Match = result.match(/<node id="parent1"[^>]*>(.*?)<\/node>/s);
      expect(parent1Match).toBeTruthy();
      expect(parent1Match![1].trim()).toBe('Parent 1'); // Only text, no child nodes
    });

    it('should throw error when node not found', async () => {
      const xml = '<tree><node id="root">Root</node></tree>';
      const command = 'MOVE id=nonexistent parent=root';
      
      await expect(applyTreeCommand(xml, command)).rejects.toThrow('Node not found: nonexistent');
    });

    it('should throw error when new parent not found', async () => {
      const xml = '<tree><node id="child">Child</node></tree>';
      const command = 'MOVE id=child parent=nonexistent';
      
      await expect(applyTreeCommand(xml, command)).rejects.toThrow('Parent not found: nonexistent');
    });
  });

  describe('RENAME command', () => {
    it('should rename a node label', async () => {
      const xml = '<tree><node id="root" label="Old Name">Old Name</node></tree>';
      const command = 'RENAME id=root label="New Name"';
      const result = await applyTreeCommand(xml, command);
      
      expect(result).toContain('label="New Name"');
      expect(result).toContain('>New Name</node>');
      expect(result).not.toContain('Old Name');
    });

    it('should handle empty label', async () => {
      const xml = '<tree><node id="root" label="Old">Old</node></tree>';
      const command = 'RENAME id=root label=""';
      const result = await applyTreeCommand(xml, command);
      
      expect(result).toContain('label=""');
    });

    it('should throw error when node not found', async () => {
      const xml = '<tree><node id="root">Root</node></tree>';
      const command = 'RENAME id=nonexistent label="New"';
      
      await expect(applyTreeCommand(xml, command)).rejects.toThrow('Node not found: nonexistent');
    });
  });

  describe('SET command', () => {
    it('should set attribute on node', async () => {
      const xml = '<tree><node id="root">Root</node></tree>';
      const command = 'SET id=root attr=type value="important"';
      const result = await applyTreeCommand(xml, command);
      
      expect(result).toContain('type="important"');
    });

    it('should update existing attribute', async () => {
      const xml = '<tree><node id="root" type="normal">Root</node></tree>';
      const command = 'SET id=root attr=type value="special"';
      const result = await applyTreeCommand(xml, command);
      
      expect(result).toContain('type="special"');
      expect(result).not.toContain('type="normal"');
    });

    it('should throw error when node not found', async () => {
      const xml = '<tree><node id="root">Root</node></tree>';
      const command = 'SET id=nonexistent attr=type value="test"';
      
      await expect(applyTreeCommand(xml, command)).rejects.toThrow('Node not found: nonexistent');
    });
  });

  describe('Complex scenarios', () => {
    it('should handle multiple operations to build complex tree', async () => {
      let xml = '<tree></tree>';
      
      // Add root
      xml = await applyTreeCommand(xml, 'ADD id=root label="Root"');
      
      // Add children
      xml = await applyTreeCommand(xml, 'ADD id=child1 label="Child 1" parent=root');
      xml = await applyTreeCommand(xml, 'ADD id=child2 label="Child 2" parent=root');
      
      // Add grandchild
      xml = await applyTreeCommand(xml, 'ADD id=grandchild1 label="Grandchild 1" parent=child1');
      
      // Set attribute
      xml = await applyTreeCommand(xml, 'SET id=grandchild1 attr=type value="leaf"');
      
      expect(xml).toContain('id="root"');
      expect(xml).toContain('id="child1"');
      expect(xml).toContain('id="child2"');
      expect(xml).toContain('id="grandchild1"');
      expect(xml).toContain('type="leaf"');
    });

    it('should handle moving nodes in complex tree', async () => {
      let xml = `<tree>
        <node id="root" label="Root">
          Root
          <node id="branch1" label="Branch 1">
            Branch 1
            <node id="leaf1" label="Leaf 1">Leaf 1</node>
          </node>
          <node id="branch2" label="Branch 2">Branch 2</node>
        </node>
      </tree>`;
      
      // Move leaf1 from branch1 to branch2
      xml = await applyTreeCommand(xml, 'MOVE id=leaf1 parent=branch2');
      
      // Leaf1 should now be under branch2
      expect(xml).toMatch(/<node id="branch2".*<node id="leaf1"/s);
    });
  });

  describe('Error handling', () => {
    it('should handle invalid XML gracefully', async () => {
      const xml = '<tree><invalid></tree>';
      const command = 'ADD id=test label="Test"';
      
      // Should not throw, but handle gracefully
      const result = await applyTreeCommand(xml, command);
      expect(result).toContain('id="test"');
    });

    it('should throw error for unknown command', async () => {
      const xml = '<tree></tree>';
      const command = 'UNKNOWN id=test';
      
      await expect(applyTreeCommand(xml, command)).rejects.toThrow('Unknown command');
    });
  });
});

describe('TreeFormatter', () => {
  describe('formatTreeForDisplay', () => {
    it('should format empty tree', async () => {
      const xml = '<tree></tree>';
      const result = await formatTreeForDisplay(xml);
      
      expect(result).toContain('🌳 Empty Tree');
      expect(result).toContain('add nodes');
    });

    it('should format simple tree', async () => {
      const xml = '<tree><node id="root" label="Root">Root</node></tree>';
      const result = await formatTreeForDisplay(xml);
      
      expect(result).toContain('🌳 Tree Structure');
      expect(result).toContain('└─ root ("Root")');
    });

    it('should format nested tree with proper indentation', async () => {
      const xml = `<tree>
        <node id="root" label="Root">
          Root
          <node id="child1" label="Child 1">Child 1</node>
          <node id="child2" label="Child 2">Child 2</node>
        </node>
      </tree>`;
      const result = await formatTreeForDisplay(xml);
      
      expect(result).toContain('└─ root ("Root")');
      expect(result).toContain('   ├─ child1 ("Child 1")');
      expect(result).toContain('   └─ child2 ("Child 2")');
    });

    it('should handle nodes with additional attributes', async () => {
      const xml = '<tree><node id="root" label="Root" type="important" status="active">Root</node></tree>';
      const result = await formatTreeForDisplay(xml);
      
      expect(result).toContain('root ("Root") [type=important status=active]');
    });
  });

  describe('getTreeStats', () => {
    it('should return zero stats for empty tree', async () => {
      const xml = '<tree></tree>';
      const stats = await getTreeStats(xml);
      
      expect(stats).toEqual({ nodeCount: 0, maxDepth: 0, leafCount: 0 });
    });

    it('should count single node', async () => {
      const xml = '<tree><node id="root">Root</node></tree>';
      const stats = await getTreeStats(xml);
      
      expect(stats).toEqual({ nodeCount: 1, maxDepth: 1, leafCount: 1 });
    });

    it('should count complex tree correctly', async () => {
      const xml = `<tree>
        <node id="root">
          Root
          <node id="child1">
            Child 1
            <node id="grandchild1">Grandchild 1</node>
          </node>
          <node id="child2">Child 2</node>
        </node>
      </tree>`;
      const stats = await getTreeStats(xml);
      
      expect(stats.nodeCount).toBe(4);
      expect(stats.maxDepth).toBe(3);
      expect(stats.leafCount).toBe(2); // grandchild1 and child2
    });
  });
});
