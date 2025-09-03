import { parseTreeCommand, parseAndValidateTreeCommand, validateTreeCommand } from '../utils/TreeCommandParser';

describe('TreeCommandParser', () => {
  describe('parseTreeCommand', () => {
    test('should parse ADD command with id only', () => {
      const result = parseTreeCommand('ADD id=node1');
      expect(result).toEqual({
        type: 'ADD',
        id: 'node1'
      });
    });

    test('should parse ADD command with id and label', () => {
      const result = parseTreeCommand('ADD id=node1 label="My Node"');
      expect(result).toEqual({
        type: 'ADD',
        id: 'node1',
        label: 'My Node'
      });
    });

    test('should parse ADD command with id, label, and parent', () => {
      const result = parseTreeCommand('ADD id=child1 label="Child Node" parent=root');
      expect(result).toEqual({
        type: 'ADD',
        id: 'child1',
        label: 'Child Node',
        parent: 'root'
      });
    });

    test('should parse REMOVE command', () => {
      const result = parseTreeCommand('REMOVE id=node1');
      expect(result).toEqual({
        type: 'REMOVE',
        id: 'node1'
      });
    });

    test('should parse MOVE command', () => {
      const result = parseTreeCommand('MOVE id=node1 parent=newParent');
      expect(result).toEqual({
        type: 'MOVE',
        id: 'node1',
        parent: 'newParent'
      });
    });

    test('should parse RENAME command', () => {
      const result = parseTreeCommand('RENAME id=node1 label="New Label"');
      expect(result).toEqual({
        type: 'RENAME',
        id: 'node1',
        label: 'New Label'
      });
    });

    test('should parse SET command with single attribute', () => {
      const result = parseTreeCommand('SET id=node1 value="test value"');
      expect(result).toEqual({
        type: 'SET',
        id: 'node1',
        value: 'test value'
      });
    });

    test('should handle case insensitive commands', () => {
      const result = parseTreeCommand('add id=node1 LABEL="Test"');
      expect(result.type).toBe('ADD');
      expect(result.id).toBe('node1');
      expect(result.label).toBe('Test');
    });

    test('should handle single quotes', () => {
      const result = parseTreeCommand("ADD id=node1 label='Single Quote Label'");
      expect(result.label).toBe('Single Quote Label');
    });

    test('should handle escaped quotes', () => {
      const result = parseTreeCommand('ADD id=node1 label="Label with \\"quotes\\""');
      expect(result.label).toBe('Label with "quotes"');
    });

    test('should throw error for invalid syntax', () => {
      expect(() => parseTreeCommand('INVALID COMMAND')).toThrow();
    });

    test('should throw error for missing required fields', () => {
      expect(() => parseTreeCommand('ADD')).toThrow();
    });
  });

  describe('validateTreeCommand', () => {
    test('should validate ADD command', () => {
      expect(() => validateTreeCommand({ type: 'ADD', id: 'node1' })).not.toThrow();
    });

    test('should validate REMOVE command', () => {
      expect(() => validateTreeCommand({ type: 'REMOVE', id: 'node1' })).not.toThrow();
    });

    test('should validate MOVE command', () => {
      expect(() => validateTreeCommand({ type: 'MOVE', id: 'node1', parent: 'parent1' })).not.toThrow();
    });

    test('should validate RENAME command', () => {
      expect(() => validateTreeCommand({ type: 'RENAME', id: 'node1', label: 'New Label' })).not.toThrow();
    });

    test('should validate SET command', () => {
      expect(() => validateTreeCommand({ type: 'SET', id: 'node1', value: 'test' })).not.toThrow();
    });

    test('should throw error for MOVE without parent', () => {
      expect(() => validateTreeCommand({ type: 'MOVE', id: 'node1' })).toThrow('MOVE command must have a parent');
    });

    test('should throw error for RENAME without label', () => {
      expect(() => validateTreeCommand({ type: 'RENAME', id: 'node1' })).toThrow('RENAME command must have a label');
    });

    test('should throw error for SET without attributes', () => {
      expect(() => validateTreeCommand({ type: 'SET', id: 'node1' })).toThrow('SET command must have at least one attribute');
    });

    test('should throw error for command without id', () => {
      expect(() => validateTreeCommand({ type: 'ADD' } as any)).toThrow('Command must have an id');
    });
  });

  describe('parseAndValidateTreeCommand', () => {
    test('should parse and validate valid command', () => {
      const result = parseAndValidateTreeCommand('ADD id=node1 label="Test"');
      expect(result).toEqual({
        type: 'ADD',
        id: 'node1',
        label: 'Test'
      });
    });

    test('should throw error for invalid command', () => {
      expect(() => parseAndValidateTreeCommand('MOVE id=node1')).toThrow();
    });
  });
});
