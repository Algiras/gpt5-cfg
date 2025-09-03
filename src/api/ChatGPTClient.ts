import OpenAI from 'openai';
import { ChatGPTResponse, InteractionConfig, ParsedInput } from '../types';
import { getTreeEditLarkGrammar } from '../grammar/TreeEditGrammar';

export class ChatGPTClient {
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, model: string = 'gpt-5-nano') {
    this.client = new OpenAI({
      apiKey: apiKey
    });
    this.model = model;
  }

  /**
   * Send a request to ChatGPT with parsed input and configuration
   */
  async processInteraction(
    parsedInput: ParsedInput,
    config: InteractionConfig,
    currentTree?: string
  ): Promise<ChatGPTResponse> {
    try {
      // If an output grammar is specified, use Responses API with a grammar tool (Lark syntax)
      {
        const input = this.buildInputString(parsedInput, config, currentTree);
        const tools: any[] = [this.buildCommandTool()];
        const response = await this.client.responses.create({
          model: this.model,
          input,
          text: { format: { type: 'text' } },
          tools,
          parallel_tool_calls: false,
          tool_choice: 'required',
          max_output_tokens: 1500,
          reasoning: { effort: 'low' }
        });

        // Debug: log to file instead of console to avoid breaking TUI
        const fs = require('fs');
        const debugLog = {
          timestamp: new Date().toISOString(),
          rawResponse: response,
          extractedText: '',
          extractedToolInput: ''
        };
        
        const { text, usage, finish_reason, tool_input } = this.extractResponsesPayload(response);
        
        debugLog.extractedText = text;
        debugLog.extractedToolInput = tool_input || 'none';
        
        try {
          fs.appendFileSync('debug.log', JSON.stringify(debugLog, null, 2) + '\n\n');
        } catch (e) {
          // Ignore file write errors
        }
        
        return {
          content: text,
          usage: {
            promptTokens: usage?.input_tokens || 0,
            completionTokens: usage?.output_tokens || 0,
            totalTokens: (usage?.input_tokens || 0) + (usage?.output_tokens || 0)
          },
          model: response.model || this.model,
          finishReason: finish_reason || 'stop',
          toolInput: tool_input
        };
      }

      // Fallback to Chat Completions API
      const messages = this.buildMessages(parsedInput, config);
      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages,
        // Omit sampling params for models that don't support them
        ...(this.supportsSamplingParams()
          ? { temperature: config.parameters.temperature, top_p: config.parameters.topP }
          : {}),
        max_tokens: config.parameters.maxTokens
      });

      const choice = completion.choices[0];
      if (!choice || !choice.message) {
        throw new Error('No response received from ChatGPT');
      }

      return {
        content: choice.message.content || '',
        usage: {
          promptTokens: completion.usage?.prompt_tokens || 0,
          completionTokens: completion.usage?.completion_tokens || 0,
          totalTokens: completion.usage?.total_tokens || 0
        },
        model: completion.model,
        finishReason: choice.finish_reason || 'unknown'
      };
    } catch (error) {
      throw new Error(`ChatGPT API error: ${error}`);
    }
  }

  /**
   * Build message array for ChatGPT API
   */
  private buildMessages(
    parsedInput: ParsedInput,
    config: InteractionConfig
  ): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

    // Add system message if provided
    if (config.prompts.system) {
      messages.push({
        role: 'system',
        content: this.interpolateTemplate(config.prompts.system, parsedInput)
      });
    }

    // Add user message
    const userContent = config.prompts.user 
      ? this.interpolateTemplate(config.prompts.user, parsedInput)
      : `Please process this structured input: ${parsedInput.original}`;
    
    messages.push({
      role: 'user',
      content: userContent
    });

    // Add assistant message if provided (for few-shot prompting)
    if (config.prompts.assistant) {
      messages.push({
        role: 'assistant',
        content: this.interpolateTemplate(config.prompts.assistant, parsedInput)
      });
    }

    // If output format is XML and grammar is specified, add a guiding instruction
    if (config.output?.format === 'xml' && config.output.grammar?.grammar) {
      messages.push({
        role: 'system',
        content: 'Respond strictly as XML that conforms to the provided grammar. Do not include explanations or surrounding text.'
      });
    }

    return messages;
  }

  /**
   * Interpolate template variables in prompt strings
   */
  private interpolateTemplate(template: string, parsedInput: ParsedInput, currentTree?: string): string {
    return template
      .replace(/\{input\}/g, parsedInput.original)
      .replace(/\{parsed\}/g, JSON.stringify(parsedInput.parsed, null, 2))
      .replace(/\{isValid\}/g, parsedInput.isValid.toString())
      .replace(/\{errors\}/g, parsedInput.errors.join(', '))
      .replace(/\{parseTree\}/g, this.formatParseTree(parsedInput.parsed))
      .replace(/\{currentTree\}/g, currentTree || '<tree></tree>');
  }

  /**
   * Format parse tree for human-readable output
   */
  private formatParseTree(nodes: any[], indent: number = 0): string {
    const indentStr = '  '.repeat(indent);
    let result = '';

    for (const node of nodes) {
      result += `${indentStr}${node.type}: ${node.value}\n`;
      if (node.children && node.children.length > 0) {
        result += this.formatParseTree(node.children, indent + 1);
      }
    }

    return result.trim();
  }

  /**
   * Build a single prompt string for Responses API
   */
  private buildInputString(parsedInput: ParsedInput, config: InteractionConfig, currentTree?: string): string {
    const sections: string[] = [];
    if (config.prompts.system) {
      sections.push(`[SYSTEM]\n${this.interpolateTemplate(config.prompts.system, parsedInput, currentTree)}`);
    }
    const user = config.prompts.user
      ? this.interpolateTemplate(config.prompts.user, parsedInput, currentTree)
      : `Please process this structured input: ${parsedInput.original}`;
    sections.push(`[USER]\n${user}`);
    if (config.prompts.assistant) {
      sections.push(`[ASSISTANT]\n${this.interpolateTemplate(config.prompts.assistant, parsedInput, currentTree)}`);
    }
    return sections.join('\n\n');
  }

  /**
   * Build a Responses API grammar tool using Lark syntax
   */
  private buildGrammarTool(config: InteractionConfig): any {
    const cfg = config.output!.grammar!.grammar;
    const lark = this.cfgToLark(cfg);
    return {
      type: 'custom',
      name: 'xml_grammar',
      description:
        'Emit ONLY the updated <tree> XML. YOU MUST REASON HEAVILY to ensure the output strictly conforms to the grammar. No prose, no markdown, no explanations.',
      format: {
        type: 'grammar',
        syntax: 'lark',
        definition: lark
      }
    };
  }

  /**
   * Build tree-edit command tool (Lark)
   */
  private buildCommandTool(): any {
    const lark = getTreeEditLarkGrammar();
    return {
      type: 'custom',
      name: 'tree_command',
      description:
        'Derive exactly one tree edit command from the user request (ADD/REMOVE/MOVE/RENAME/SET). Output must conform to the grammar.',
      format: {
        type: 'grammar',
        syntax: 'lark',
        definition: lark
      }
    };
  }

  /**
   * Convert our simple CFG format to a Lark grammar.
   * - Replace S -> with start:
   * - Lowercase non-terminals; preserve quoted strings and /regex/ terminals
   */
  private cfgToLark(cfg: string): string {
    const lines = cfg
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#'));

    const mapToken = (tok: string): string => {
      if (tok.startsWith('"') && tok.endsWith('"')) return tok; // literal terminal
      if (tok.startsWith('/') && tok.endsWith('/')) return tok; // regex terminal
      // non-terminal
      return tok === 'S' ? 'start' : tok.toLowerCase();
    };

    const out: string[] = [];
    for (const line of lines) {
      const arrowIdx = line.indexOf('->');
      if (arrowIdx === -1) {
        out.push(line);
        continue;
      }
      const left = line.substring(0, arrowIdx).trim();
      const right = line.substring(arrowIdx + 2).trim();

      const lhs = left === 'S' ? 'start' : left.toLowerCase();
      const rhsTokens = right.split(/\s+/).map(mapToken);
      out.push(`${lhs}: ${rhsTokens.join(' ')}`);
    }
    return out.join('\n');
  }

  /**
   * Extract text and usage from Responses API payload
   */
  private extractResponsesPayload(resp: any): { text: string; usage?: any; finish_reason?: string; tool_input?: string } {
    let text = '';
    let finish: string | undefined;
    let toolInput: string | undefined;
    if (Array.isArray(resp.output)) {
      for (const item of resp.output) {
        if (Array.isArray(item.content)) {
          for (const c of item.content) {
            if (c?.type === 'output_text' && typeof c.text === 'string') {
              text += c.text;
            }
          }
        }
        // Heuristics to capture tool call input per cookbook examples
        if ((item as any)?.type === 'tool_call' && typeof (item as any)?.input === 'string') {
          toolInput = (item as any).input;
        }
        if (typeof (item as any)?.input === 'string' && !(item as any)?.content) {
          toolInput = toolInput || (item as any).input;
        }
        if ((item as any)?.finish_reason) finish = (item as any).finish_reason;
      }
    }
    return { text, usage: resp.usage, finish_reason: finish, tool_input: toolInput };
  }

  private supportsSamplingParams(): boolean {
    // GPT-5 series may not support temperature/top_p in certain endpoints/models
    return !/^gpt-5/.test(this.model);
  }

  /**
   * Test API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const models = await this.client.models.list();
      return models.data && models.data.length > 0;
    } catch (error) {
      // Do not block startup on connectivity nuances; caller may proceed.
      console.warn('Model list failed during connection test; proceeding anyway:', error);
      return true;
    }
  }

  /**
   * Get available models
   */
  async getAvailableModels(): Promise<string[]> {
    try {
      const models = await this.client.models.list();
      return models.data
        .filter(model => model.id.includes('gpt'))
        .map(model => model.id)
        .sort();
    } catch (error) {
      console.error('Failed to get available models:', error);
      return [];
    }
  }

  /**
   * Stream response from ChatGPT (for real-time interaction)
   */
  async *streamInteraction(
    parsedInput: ParsedInput,
    config: InteractionConfig
  ): AsyncGenerator<string, void, unknown> {
    try {
      const messages = this.buildMessages(parsedInput, config);
      
      const stream = await this.client.chat.completions.create({
        model: this.model,
        messages: messages,
        temperature: config.parameters.temperature,
        max_tokens: config.parameters.maxTokens,
        top_p: config.parameters.topP,
        stream: true
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          yield content;
        }
      }
    } catch (error) {
      throw new Error(`ChatGPT streaming error: ${error}`);
    }
  }
}
