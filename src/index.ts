import { InteractionEngine } from './core/InteractionEngine';
import { TUIApp } from './ui/TUI';
import * as dotenv from 'dotenv';

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
        console.error('❌ OPENAI_API_KEY environment variable is required');
        console.log('Please set your OpenAI API key in the .env file');
        process.exit(1);
      }

      const model = process.env.OPENAI_MODEL || 'gpt-5-nano';

      // Prefer XSD if provided, else fall back to built-in tree CFG
      console.log('🔧 Initializing engine...');
      const xsdPathEnv = process.env.XSD_PATH;
      if (xsdPathEnv) {
        await this.engine.initializeFromXSD(apiKey, xsdPathEnv, model);
      } else {
        await this.engine.initializeDefaultTree(apiKey, model);
      }
      console.log('✅ Engine initialized successfully!\n');

      // Launch the blessed TUI with error handling
      try {
        new TUIApp(this.engine);
      } catch (tuiError) {
        console.error('TUI failed to start:', tuiError);
        console.log('Falling back to simple console mode...');
        // Simple fallback - just show current tree
        console.log('Current tree:');
        console.log(this.engine.getTreeXml());
        console.log('\nTUI had issues. Try running in a different terminal or with TERM=xterm');
        process.exit(1);
      }

    } catch (error) {
      console.error('❌ Failed to start application:', error);
      process.exit(1);
    }
  }


}

// Start the application
const app = new CFGChatGPTApp();
app.start().catch(console.error);
