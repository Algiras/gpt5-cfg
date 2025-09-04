// Core types for the tree editing system

export interface InteractionConfig {
  name: string;
  description: string;
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
}

export interface ParsedInput {
  original: string;
  parsed: any[]; // Simplified since we don't use complex parsing
  isValid: boolean;
  errors: string[];
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