import OpenAI from 'openai';
import { ChatGPTResponse, InteractionConfig, ParsedInput } from '../types';
import * as fs from 'fs';
import * as path from 'path';
import { logger, logApiCall } from '../utils/logger';

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
    const startTime = Date.now();
    
    try {
      const input = this.buildInputString(parsedInput, config, currentTree);
      const tools: any[] = [this.buildCommandTool()];
      
      const request = {
        model: this.model,
        input,
        text: { format: { type: 'text' as const } },
        tools,
        parallel_tool_calls: false,
        tool_choice: 'required' as const,
        max_output_tokens: 1500,
        reasoning: { effort: 'low' as const }
      };

      logger.info('Sending request to ChatGPT API', {
        model: this.model,
        inputLength: input.length,
        toolsCount: tools.length
      });

      const response = await this.client.responses.create(request);
      const duration = Date.now() - startTime;
      
      const { text, usage, finish_reason, tool_input } = this.extractResponsesPayload(response);
      
      // Log API call details
      logApiCall('responses.create', request, response, duration);
      
      logger.info('ChatGPT API response received', {
        model: response.model || this.model,
        usage: {
          inputTokens: usage?.input_tokens || 0,
          outputTokens: usage?.output_tokens || 0
        },
        finishReason: finish_reason,
        hasToolInput: !!tool_input,
        duration
      });

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
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('ChatGPT API error', {
        model: this.model,
        error: error instanceof Error ? error.message : String(error),
        duration
      });
      throw new Error(`ChatGPT API error: ${error}`);
    }
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
      .replace(/\{parseTree\}/g, JSON.stringify(parsedInput.parsed, null, 2))
      .replace(/\{currentTree\}/g, currentTree || '<tree></tree>');
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
   * Build tree-edit command tool (Lark)
   */
  private buildCommandTool(): any {
    const grammarPath = path.join(__dirname, '../grammar/tree-commands.lark');
    const lark = fs.readFileSync(grammarPath, 'utf8');
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


  /**
   * Test API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      logger.info('Testing ChatGPT API connection');
      const models = await this.client.models.list();
      const success = models.data && models.data.length > 0;
      
      if (success) {
        logger.info('ChatGPT API connection test successful', {
          modelsAvailable: models.data.length
        });
      } else {
        logger.warn('ChatGPT API connection test returned no models');
      }
      
      return success;
    } catch (error) {
      logger.warn('Model list failed during connection test; proceeding anyway', {
        error: error instanceof Error ? error.message : String(error)
      });
      return true;
    }
  }


}
