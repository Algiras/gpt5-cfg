import { CFGParser } from '../parser/CFGParser';
import { ChatGPTClient } from '../api/ChatGPTClient';
import { 
  CFGGrammar, 
  InteractionConfig, 
  ParsedInput, 
  InteractionResult,
} from '../types';
import * as fs from 'fs';
import { generateCFGfromXSD, XSDSchemaModel } from '../grammar/XSDToCFG';
import { applyTreeCommand } from '../utils/TreeOps';

export class InteractionEngine {
  private cfgParser: CFGParser | null = null;
  private chatGPTClient: ChatGPTClient | null = null;
  private configurations: InteractionConfig[] = [];
  private currentConfig: InteractionConfig | null = null;
  private grammarCache: Map<string, CFGGrammar> = new Map();
  private xsdSchemaModel: XSDSchemaModel | null = null;
  private initialXmlContext: string | null = null;
  private outputGrammar: CFGGrammar | null = null;
  private outputGrammarText: string | null = null;
  private treeXml: string | null = null;

  constructor() {}

  /**
   * Initialize the engine with API key and configuration
   */
  async initialize(apiKey: string, _configPath: string, model: string = 'gpt-5-nano'): Promise<void> {
    // Deprecated: XML config is not supported; route to XSD mode if env is set
    const xsdPath = process.env.XSD_PATH;
    if (!xsdPath) throw new Error('XML config mode removed. Provide XSD_PATH in .env.');
    await this.initializeFromXSD(apiKey, xsdPath, model);
  }

  /**
   * Initialize in XSD-first mode: no XML config, derive output CFG from XSD and enforce
   */
  async initializeFromXSD(apiKey: string, xsdPath: string, model: string = 'gpt-5-nano'): Promise<void> {
    try {
      this.chatGPTClient = new ChatGPTClient(apiKey, model);
      // Try a lightweight connectivity test, but do not fail hard
      try {
        await this.chatGPTClient.testConnection();
      } catch (e) {
        console.warn('Proceeding despite connection test issue:', e);
      }

      const xsdText = fs.readFileSync(xsdPath, 'utf-8');
      const { cfg, schema } = await generateCFGfromXSD(xsdText);
      this.xsdSchemaModel = schema;
      // Store output grammar for display/validation context
      this.outputGrammarText = cfg;
      try {
        this.outputGrammar = CFGParser.loadGrammarFromText(cfg);
      } catch {
        this.outputGrammar = null;
      }
      // Always start with an empty tree; no external XML path
      this.initialXmlContext = null;
      this.treeXml = '<tree></tree>';

      const config: InteractionConfig = {
        name: 'xsd_mode',
        description: `XSD-derived output grammar for <${schema.root}>`,
        grammar: undefined,
        grammarInline: undefined,
        prompts: {
          system: `You must use the tree_command tool to edit the XML tree. Generate exactly one command: ADD, REMOVE, MOVE, RENAME, or SET.`,
          user: `Current tree XML:\n{currentTree}\n\nUser request: {input}`
        },
        parameters: {
          temperature: 0.3,
          maxTokens: 800,
          topP: 0.9
        },
        validation: { required: false },
        output: {
          format: 'xml'
        }
      };

      this.configurations = [config];
      this.currentConfig = config;
    } catch (error) {
      throw new Error(`Failed to initialize from XSD: ${error}`);
    }
  }

  /**
   * Initialize with a built-in simple tree CFG (no XSD required)
   */
  async initializeDefaultTree(apiKey: string, model: string = 'gpt-5-nano'): Promise<void> {
    try {
      this.chatGPTClient = new ChatGPTClient(apiKey, model);
      try {
        await this.chatGPTClient.testConnection();
      } catch (e) {
        console.warn('Proceeding despite connection test issue:', e);
      }
      // Built-in simple CFG for a nested <tree><node>...</node></tree>
      const cfg = [
        'S -> Root',
        'Root -> "<tree>" nodeList "</tree>"',
        'nodeList -> node | node nodeList',
        'node -> "<node>" Text nodeChildren "</node>"',
        'nodeChildren -> nodeList |',
        'Text -> /[^<][^<\\n]*/'
      ].join('\n');
      this.outputGrammarText = cfg;
      try {
        this.outputGrammar = CFGParser.loadGrammarFromText(cfg);
      } catch {
        this.outputGrammar = null;
      }
      this.xsdSchemaModel = null;
      this.initialXmlContext = null;
      this.treeXml = '<tree></tree>';

      const config: InteractionConfig = {
        name: 'built_in_tree',
        description: 'Built-in CFG for <tree> with nested <node>s',
        grammar: undefined,
        grammarInline: undefined,
        prompts: {
          system: 'You must use the tree_command tool to edit the XML tree. Generate exactly one command: ADD, REMOVE, MOVE, RENAME, or SET.',
          user: 'Current tree XML:\n{currentTree}\n\nUser request: {input}'
        },
        parameters: {
          temperature: 0.3,
          maxTokens: 800,
          topP: 0.9
        },
        validation: { required: false },
        output: {
          format: 'text'
        }
      };

      this.configurations = [config];
      this.currentConfig = config;
    } catch (error) {
      throw new Error(`Failed to initialize default tree: ${error}`);
    }
  }

  /**
   * Load a grammar file and create parser
   */
  async loadGrammar(grammarPath?: string, grammarInline?: string): Promise<void> {
    try {
      if (!grammarPath && !grammarInline) {
        this.cfgParser = null;
        return;
      }

      // If inline grammar is provided, prefer it
      if (grammarInline) {
        const grammar = CFGParser.loadGrammarFromText(grammarInline);
        this.cfgParser = new CFGParser(grammar);
        return;
      }

      // Check cache first
      if (grammarPath && this.grammarCache.has(grammarPath)) {
        const grammar = this.grammarCache.get(grammarPath)!;
        this.cfgParser = new CFGParser(grammar);
        return;
      }

      // Load grammar from file
      if (grammarPath) {
        const grammarContent = fs.readFileSync(grammarPath, 'utf-8');
        const grammar = CFGParser.loadGrammarFromText(grammarContent);
        this.grammarCache.set(grammarPath, grammar);
        this.cfgParser = new CFGParser(grammar);
        console.log(`Loaded grammar from ${grammarPath}`);
      }
    } catch (error) {
      throw new Error(`Failed to load grammar: ${error}`);
    }
  }

  /**
   * Set active configuration by name
   */
  async setConfiguration(configName: string): Promise<void> {
    const config = this.configurations.find(c => c.name === configName);
    if (!config) {
      throw new Error(`Configuration '${configName}' not found`);
    }

    this.currentConfig = config;
    
    // Load the grammar for this configuration if provided
    await this.loadGrammar(config.grammar, config.grammarInline);
    
    console.log(`Switched to configuration: ${configName}`);
  }

  /**
   * Process user input through the complete pipeline
   */
  async processInput(input: string): Promise<InteractionResult> {
    if (!this.chatGPTClient || !this.currentConfig) {
      throw new Error('Engine not properly initialized');
    }

    const timestamp = new Date();

    try {
      // Parse input using CFG if configured; otherwise pass-through
      const parsedInput = this.cfgParser ? this.cfgParser.parse(input) : {
        original: input,
        parsed: [],
        isValid: true,
        errors: []
      };
      
      // Validate if required
      if (this.currentConfig.validation.required && !parsedInput.isValid) {
        return {
          input: parsedInput,
          response: {
            content: `Invalid input: ${parsedInput.errors.join(', ')}`,
            usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
            model: '',
            finishReason: 'validation_failed'
          },
          config: this.currentConfig,
          timestamp,
          success: false,
          error: 'Input validation failed'
        };
      }

      // Process with ChatGPT using a Lark tool for tree-edit commands
      const response = await this.chatGPTClient.processInteraction(parsedInput, {
        ...this.currentConfig,
        output: this.currentConfig.output,
        // Provide a tree-edit grammar tool via client; engine focuses on context
      } as any, this.treeXml || '<tree></tree>');

      // Optional: Validate output against output grammar (CFG) if specified
      if (this.currentConfig.output?.grammar?.grammar) {
        try {
          const { CFGParser } = await import('../parser/CFGParser');
          const outputGrammar = CFGParser.loadGrammarFromText(this.currentConfig.output.grammar.grammar);
          const outputParser = new CFGParser(outputGrammar);
          const validation = outputParser.parse(response.content);
          if (!validation.isValid) {
            response.content = `<!-- Output failed grammar validation: ${validation.errors.join(', ')} -->\n` + response.content;
          }
        } catch (err) {
          // Non-fatal: keep original output
        }
      }

      // Optional: Validate XML output via simple XSD-derived schema if present
      if (this.currentConfig.output?.format === 'xml' && this.xsdSchemaModel) {
        try {
          const { SimpleXSDValidator } = await import('../validators/SimpleXSDValidator');
          const result = await SimpleXSDValidator.validate(response.content, this.xsdSchemaModel);
          if (!result.valid) {
            response.content = `<!-- XSD validation failed: ${result.errors.join('; ')} -->\n` + response.content;
          }
        } catch { /* ignore */ }
      }

      // Apply tool call (command) if provided; otherwise accept direct XML
      const content = response.content.trim();
      if (response.toolInput) {
        try {
          this.treeXml = await applyTreeCommand(this.treeXml || '<tree></tree>', response.toolInput);
        } catch {
          if (content.startsWith('<tree')) this.treeXml = content;
        }
      } else if (content.startsWith('<tree')) {
        this.treeXml = content;
      }

      return {
        input: parsedInput,
        response,
        config: this.currentConfig,
        timestamp,
        success: true
      };

    } catch (error) {
      return {
        input: { original: input, parsed: [], isValid: false, errors: [error instanceof Error ? error.message : 'Unknown error'] },
        response: {
          content: '',
          usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
          model: '',
          finishReason: 'error'
        },
        config: this.currentConfig,
        timestamp,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Process input with streaming response
   */
  async *processInputStreaming(input: string): AsyncGenerator<{ content: string; done: boolean; result?: InteractionResult }, void, unknown> {
    if (!this.cfgParser || !this.chatGPTClient || !this.currentConfig) {
      throw new Error('Engine not properly initialized');
    }

    const timestamp = new Date();
    
    try {
      // Parse input using CFG
      const parsedInput = this.cfgParser.parse(input);
      
      // Validate if required
      if (this.currentConfig.validation.required && !parsedInput.isValid) {
        const result: InteractionResult = {
          input: parsedInput,
          response: {
            content: `Invalid input: ${parsedInput.errors.join(', ')}`,
            usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
            model: '',
            finishReason: 'validation_failed'
          },
          config: this.currentConfig,
          timestamp,
          success: false,
          error: 'Input validation failed'
        };
        
        yield { content: result.response.content, done: true, result };
        return;
      }

      // Stream response from ChatGPT
      let fullContent = '';
      for await (const chunk of this.chatGPTClient.streamInteraction(parsedInput, this.currentConfig)) {
        fullContent += chunk;
        yield { content: chunk, done: false };
      }

      // Optional: Validate output against output grammar if specified
      // Optional: Validate output against output grammar if specified
      if (this.currentConfig.output?.grammar?.grammar) {
        try {
          const { CFGParser } = await import('../parser/CFGParser');
          const outputGrammar = CFGParser.loadGrammarFromText(this.currentConfig.output.grammar.grammar);
          const outputParser = new CFGParser(outputGrammar);
          const validation = outputParser.parse(fullContent);
          if (!validation.isValid) {
            fullContent = `<!-- Output failed grammar validation: ${validation.errors.join(', ')} -->\n` + fullContent;
          }
        } catch (err) {
          // ignore
        }
      }

      // Optional: Validate XML via schema
      if (this.currentConfig.output?.format === 'xml' && this.xsdSchemaModel) {
        try {
          const { SimpleXSDValidator } = await import('../validators/SimpleXSDValidator');
          const res = await SimpleXSDValidator.validate(fullContent, this.xsdSchemaModel);
          if (!res.valid) {
            fullContent = `<!-- XSD validation failed: ${res.errors.join('; ')} -->\n` + fullContent;
          }
        } catch { /* ignore */ }
      }

      // Create final result
      const result: InteractionResult = {
        input: parsedInput,
        response: {
          content: fullContent,
          usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }, // Streaming doesn't provide usage info
          model: this.chatGPTClient['model'],
          finishReason: 'stop'
        },
        config: this.currentConfig,
        timestamp,
        success: true
      };

      yield { content: '', done: true, result };

    } catch (error) {
      const result: InteractionResult = {
        input: { original: input, parsed: [], isValid: false, errors: [error instanceof Error ? error.message : 'Unknown error'] },
        response: {
          content: '',
          usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
          model: '',
          finishReason: 'error'
        },
        config: this.currentConfig,
        timestamp,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      yield { content: `Error: ${result.error}`, done: true, result };
    }
  }

  /**
   * Get list of available configurations
   */
  getConfigurations(): InteractionConfig[] {
    return [...this.configurations];
  }

  /**
   * Get current configuration
   */
  getCurrentConfiguration(): InteractionConfig | null {
    return this.currentConfig;
  }

  /**
   * Reload configurations from file
   */
  async reloadConfigurations(_configPath: string): Promise<void> {
    // No-op in XSD-only mode
    return;
  }

  /**
   * Validate input without processing
   */
  validateInput(input: string): ParsedInput {
    if (this.cfgParser) return this.cfgParser.parse(input);
    return { original: input, parsed: [], isValid: true, errors: [] };
  }

  /**
   * Get grammar information
   */
  getGrammarInfo(): any {
    // Prefer input grammar if present
    if (this.cfgParser) {
      return {
        startSymbol: this.cfgParser['grammar'].startSymbol,
        rules: this.cfgParser['grammar'].rules,
        terminals: this.cfgParser['grammar'].terminals,
        nonTerminals: this.cfgParser['grammar'].nonTerminals
      };
    }
    // Fallback to output grammar (XSD-derived CFG) for display
    if (this.outputGrammar) {
      return {
        startSymbol: this.outputGrammar.startSymbol,
        rules: this.outputGrammar.rules,
        terminals: this.outputGrammar.terminals,
        nonTerminals: this.outputGrammar.nonTerminals
      };
    }
    return null;
  }

  /**
   * Get current XML tree snapshot
   */
  getTreeXml(): string {
    return this.treeXml || '<tree></tree>';
  }
}
