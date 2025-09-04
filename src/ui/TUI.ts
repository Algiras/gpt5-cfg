import blessed, { Widgets } from 'blessed';
import { InteractionEngine } from '../core/InteractionEngine';
import { formatTreeForDisplay, getTreeStats } from '../utils/SimpleTreeOps';

export class TUIApp {
  private screen: Widgets.Screen;
  private chatBox: Widgets.BoxElement;
  private treeBox: Widgets.BoxElement;
  private input: Widgets.TextboxElement;
  private loadingInterval?: NodeJS.Timeout;

  constructor(private engine: InteractionEngine) {
    this.screen = blessed.screen({ 
      smartCSR: true, 
      title: 'CFG-ChatGPT Tree Editor',
      warnings: false,
      dockBorders: true,
      ignoreLocked: ['C-c']
    });

    const width = this.screen.width as number;
    const leftWidth = Math.floor((width * 2) / 3);

    this.chatBox = blessed.box({
      top: 0, left: 0, width: leftWidth, height: '100%-3',
      label: ' Chat ', 
      border: { type: 'line' }, 
      scrollable: true, 
      alwaysScroll: true,
      tags: false
    });

    this.treeBox = blessed.box({
      top: 0, left: leftWidth, width: '100%-' + leftWidth, height: '100%-3',
      label: ' Tree ', 
      border: { type: 'line' }, 
      scrollable: true,
      tags: false
    });

    this.input = blessed.textbox({
      bottom: 0, left: 0, width: '100%', height: 3,
      inputOnFocus: true, border: { type: 'line' }, label: ' > '
    });

    this.screen.append(this.chatBox);
    this.screen.append(this.treeBox);
    this.screen.append(this.input);

    this.screen.key(['C-c', 'q'], () => process.exit(0));
    this.input.key('enter', async () => {
      const value = this.input.getValue();
      this.input.clearValue();
      this.input.focus();
      if (value.trim().length === 0) { this.screen.render(); return; }
      
      // Handle commands
      if (value.trim().startsWith('/')) {
        this.appendChat(`> ${value}`);
        const command = value.trim().slice(1).toLowerCase();
        if (command === 'exit' || command === 'quit') {
          this.appendChat('Thanks for using CFG Tree Editor! Goodbye!');
          this.screen.render();
          setTimeout(() => process.exit(0), 500);
          return;
        } else if (command === 'help') {
          this.appendChat('========================================');
          this.appendChat('Help - Available Commands:');
          this.appendChat('  /exit, /quit  - Exit the application');
          this.appendChat('  /help         - Show this help message');
          this.appendChat('');
          this.appendChat('Natural Language Examples:');
          this.appendChat('  "Add a root node"');
          this.appendChat('  "Add child node under root"');
          this.appendChat('  "Remove node1"');
          this.appendChat('  "Move child1 to parent2"');
          this.appendChat('  "Rename node1 to \\"New Name\\""');
          this.appendChat('========================================');
          this.screen.render();
          return;
        } else {
          this.appendChat(`[ERROR] Unknown command: /${command}`);
          this.appendChat('* Type /help for available commands');
          this.screen.render();
          return;
        }
      }
      
      this.appendChat(`> ${value}`);
      try {
        const treeBefore = this.engine.getTreeXml();
        // Show animated loading indicator
        this.startLoading();
        
        const result = await this.engine.processInput(value);
        
        // Stop loading animation
        this.stopLoading();
        
        if (result.success) {
          const treeAfter = this.engine.getTreeXml();
          const treeChanged = treeBefore !== treeAfter;
          
          // Show the assistant's response if available, otherwise show a success message
          const assistantResponse = result.response.content?.trim();
          if (assistantResponse && !assistantResponse.startsWith('<tree')) {
            this.appendChat(`AI: ${assistantResponse}`);
          } else if (treeChanged) {
            this.appendChat('[SUCCESS] Tree updated successfully');
          } else {
            this.appendChat('[INFO] No changes made');
          }
          
          await this.updateTreeDisplay();
        } else {
          this.appendChat(`[ERROR] ${result.error}`);
        }
      } catch (e) {
        this.stopLoading(); // Make sure loading stops on error
        this.appendChat(`[ERROR] ${e instanceof Error ? e.message : String(e)}`);
      }
      this.screen.render();
    });

    // Initial tree and welcome message
    this.initializeTree();
    this.appendChat('=== Welcome to CFG-ChatGPT Tree Editor! ===');
    this.appendChat('========================================');
    this.appendChat('* Try: "Add a root node", "Add child under root", "Remove node1"');
    this.appendChat('* Commands: /exit, /quit, /help');
    this.appendChat('');
    this.input.focus();
    this.screen.render();
  }

  private appendChat(text: string): void {
    const current = this.chatBox.getContent() || '';
    this.chatBox.setContent((current + '\n' + text).trim());
  }

  private removeLastChatMessage(): void {
    const current = this.chatBox.getContent() || '';
    const lines = current.split('\n');
    if (lines.length > 0) {
      lines.pop(); // Remove last line
      this.chatBox.setContent(lines.join('\n'));
    }
  }

  private startLoading(): void {
    const spinners = ['|', '/', '-', '\\'];
    let i = 0;
    
    this.appendChat('| Processing...');
    
    this.loadingInterval = setInterval(() => {
      i = (i + 1) % spinners.length;
      this.removeLastChatMessage();
      this.appendChat(`${spinners[i]} Processing...`);
      this.screen.render();
    }, 200);
  }

  private stopLoading(): void {
    if (this.loadingInterval) {
      clearInterval(this.loadingInterval);
      this.loadingInterval = undefined;
    }
    this.removeLastChatMessage();
  }

  private async initializeTree(): Promise<void> {
    const treeXml = this.engine.getTreeXml();
    const formattedTree = await formatTreeForDisplay(treeXml);
    const stats = await getTreeStats(treeXml);
    
    this.treeBox.setContent(formattedTree + `\n📊 Stats: ${stats.nodeCount} nodes, depth ${stats.maxDepth}, ${stats.leafCount} leaves`);
    this.screen.render();
  }

  private async updateTreeDisplay(): Promise<void> {
    const treeXml = this.engine.getTreeXml();
    const formattedTree = await formatTreeForDisplay(treeXml);
    const stats = await getTreeStats(treeXml);
    
    this.treeBox.setContent(formattedTree + `\n📊 Stats: ${stats.nodeCount} nodes, depth ${stats.maxDepth}, ${stats.leafCount} leaves`);
  }
}


