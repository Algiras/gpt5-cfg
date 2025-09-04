import { InteractionEngine } from './core/InteractionEngine';
import { TUIApp } from './ui/TUI';
import * as dotenv from 'dotenv';
import { logger } from './utils/logger';

// Load environment variables
dotenv.config();

class CFGChatGPTApp {
  private engine: InteractionEngine;

  constructor() {
    this.engine = new InteractionEngine();
  }

  async start(): Promise<void> {
    try {
      // Get API key
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        logger.error('OPENAI_API_KEY environment variable is required');
        logger.info('Please set your OpenAI API key in the .env file');
        process.exit(1);
      }

      const model = process.env.OPENAI_MODEL || 'gpt-5-nano';

      // Prefer XSD if provided, else fall back to built-in tree CFG
      logger.info('Initializing engine', { model });
      await this.engine.initializeDefaultTree(apiKey, model);
      logger.info('Engine initialized successfully');

      // Launch the blessed TUI with error handling
      try {
        new TUIApp(this.engine);
      } catch (tuiError) {
        logger.error('TUI failed to start', { 
          error: tuiError instanceof Error ? tuiError.message : String(tuiError) 
        });
        logger.info('Falling back to simple console mode');
        // Simple fallback - just show current tree
        logger.info('Current tree', { tree: this.engine.getTreeXml() });
        logger.warn('TUI had issues. Try running in a different terminal or with TERM=xterm');
        process.exit(1);
      }

    } catch (error) {
      logger.error('Failed to start application', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      process.exit(1);
    }
  }


}

// Start the application
const app = new CFGChatGPTApp();
app.start().catch((error) => {
  logger.error('Application startup failed', { 
    error: error instanceof Error ? error.message : String(error) 
  });
  process.exit(1);
});
