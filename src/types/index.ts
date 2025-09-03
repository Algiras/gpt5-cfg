// Core types for the CFG-ChatGPT interaction system

export interface CFGRule {
  name: string;
  productions: string[];
}

export interface CFGGrammar {
  startSymbol: string;
  rules: CFGRule[];
  terminals: string[];
  nonTerminals: string[];
}

export interface InteractionConfig {
  name: string;
  description: string;
  grammar?: string; // Optional path to CFG grammar file
  grammarInline?: string; // Optional inline CFG grammar
  prompts: {
    system?: string;
    user?: string;
    assistant?: string;
  };
  parameters: {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
  };
  validation: {
    required: boolean;
    pattern?: string;
  };
  output?: OutputSpec;
}

export interface ParsedInput {
  original: string;
  parsed: ParseNode[];
  isValid: boolean;
  errors: string[];
}

export interface ParseNode {
  type: 'terminal' | 'non-terminal';
  value: string;
  children?: ParseNode[];
  position: {
    start: number;
    end: number;
  };
}

export interface ChatGPTResponse {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  finishReason: string;
  toolInput?: string; // optional tool invocation content (e.g., Lark command)
}

export interface InteractionResult {
  input: ParsedInput;
  response: ChatGPTResponse;
  config: InteractionConfig;
  timestamp: Date;
  success: boolean;
  error?: string;
}

export interface OutputSpec {
  format?: 'xml' | 'text' | 'json';
  grammar?: OutputGrammarConfig;
  xsd?: string; // Inline XSD schema text
  xsdPath?: string; // XSD schema file path
}

export interface OutputGrammarConfig {
  type: 'cfg';
  grammar: string; // CFG text used to constrain the model's output
  description?: string;
}
