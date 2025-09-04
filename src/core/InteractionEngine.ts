import { ChatGPTClient } from '../api/ChatGPTClient';
import { 
  InteractionConfig, 
  ParsedInput, 
  InteractionResult,
} from '../types';
import { applyTreeCommand } from '../utils/SimpleTreeOps';
import { logger, logTreeOperation } from '../utils/logger';

export class InteractionEngine {
  private chatGPTClient: ChatGPTClient | null = null;
  private treeJson: string | null = null;

  constructor() {}

  /**
   * Initialize with default tree mode (no XSD)
   */
  async initializeDefaultTree(apiKey: string, model: string = 'gpt-4o-mini'): Promise<void> {
    logger.info('Initializing InteractionEngine', { model });
    
    this.chatGPTClient = new ChatGPTClient(apiKey, model);
    
    // Test connection
    try {
      await this.chatGPTClient.testConnection();
      logger.info('ChatGPT connection successful');
    } catch (error) {
      logger.error('Failed to connect to ChatGPT', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw new Error(`Failed to connect to ChatGPT: ${error}`);
    }

    // Initialize with empty tree
    this.treeJson = '{"nodes":[]}';
    logger.info('Engine initialized with default tree mode');
  }

  /**
   * Initialize from XSD file (legacy support)
   */
  async initializeFromXSD(apiKey: string, xsdPath: string, model: string = 'gpt-4o-mini'): Promise<void> {
    // For now, just initialize with default tree
    // XSD support can be added later if needed
    logger.warn('XSD mode not fully supported, using default tree mode', { xsdPath });
    await this.initializeDefaultTree(apiKey, model);
  }

  /**
   * Process user input and return interaction result
   */
  async processInput(input: string): Promise<InteractionResult> {
    if (!this.chatGPTClient) {
      throw new Error('Engine not initialized. Call initialize() first.');
    }

    try {
      const currentTree = this.treeJson || '{"nodes":[]}';
      
      // Create ParsedInput
      const parsedInput: ParsedInput = {
        original: input,
        parsed: [],
        isValid: true,
        errors: []
      };

      const config: InteractionConfig = {
        name: 'tree_editing',
        description: 'Tree editing with Lark grammar',
        prompts: {},
        parameters: {},
        validation: { required: false }
      };

      const response = await this.chatGPTClient.processInteraction(parsedInput, config, currentTree);

      let result: InteractionResult = {
        input: parsedInput,
        response: response,
        config: config,
        timestamp: new Date(),
        success: true
      };

      // Apply tool commands if present
      if (response.toolInput && response.toolInput !== 'none') {
        try {
          logger.info('Applying tree command', { command: response.toolInput });
          const newTreeJson = await applyTreeCommand(currentTree, response.toolInput);
          this.treeJson = newTreeJson;
          logTreeOperation('apply_command', response.toolInput, true);
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          logger.error('Error applying tree command', {
            command: response.toolInput,
            error: errorMsg
          });
          logTreeOperation('apply_command', response.toolInput, false, errorMsg);
          result.error = `Error applying command: ${error}`;
          result.success = false;
        }
      }

      return result;
    } catch (error) {
      const parsedInput: ParsedInput = {
        original: input,
        parsed: [],
        isValid: false,
        errors: [String(error)]
      };

      return {
        input: parsedInput,
        response: {
          content: `Error processing input: ${error}`,
          usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
          model: 'unknown',
          finishReason: 'error'
        },
        config: {
          name: 'tree_editing',
          description: 'Tree editing with Lark grammar',
          prompts: {},
          parameters: {},
          validation: { required: false }
        },
        timestamp: new Date(),
        success: false,
        error: String(error)
      };
    }
  }

  /**
   * Get current tree JSON
   */
  getTreeXml(): string {
    return this.treeJson || '{"nodes":[]}';
  }

  /**
   * Set tree JSON (for testing or manual updates)
   */
  setTreeXml(json: string): void {
    this.treeJson = json;
  }

  /**
   * Reset tree to empty state
   */
  resetTree(): void {
    this.treeJson = '{"nodes":[]}';
  }

  /**
   * Get current configuration info
   */
  getCurrentConfigInfo(): string {
    return 'Using built-in tree editing mode with Lark grammar';
  }
}