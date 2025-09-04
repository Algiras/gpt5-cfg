# CFG ChatGPT Tree Editor

A sophisticated TypeScript application that leverages OpenAI's GPT-5 **Context Free Grammar (CFG)** capabilities to enable natural language interaction with structured data trees. This project demonstrates cutting-edge AI integration with formal grammar constraints and real-time tree manipulation.

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Architecture](#️-architecture)
- [Installation](#️-installation)
- [Usage](#-usage)
- [Testing](#-testing)
- [Logging](#-logging)
- [OpenAI GPT-5 CFG Insights](#-openai-gpt-5-cfg-insights)
- [Development](#-development)
- [Future Enhancements](#-future-enhancements)
- [Contributing](#-contributing)
- [License](#-license)

## 🚀 Overview

This application showcases the power of **OpenAI's GPT-5 Responses API** with **Lark grammar syntax** to create a constrained AI interaction system. Users can describe tree operations in natural language, and the AI responds with precisely structured commands that modify an in-memory JSON tree.

![Application Screenshot](images/Screenshot%202025-09-04%20at%2009.17.30.png)
*Split-screen terminal interface showing natural language chat (left) and real-time tree visualization (right)*

### Key Innovation: CFG-Constrained AI

- **Natural Language Input**: "Add a new node called 'Settings' under the root"
- **Structured AI Output**: `ADD id=settings label="Settings" parent=root`
- **Grammar Enforcement**: AI output is guaranteed to conform to predefined Lark grammar rules

## 🎯 Features

### Core Capabilities
- 🌳 **Real-time Tree Editing** - Interactive JSON tree manipulation via AI commands
- 🎨 **Split-screen TUI** - Beautiful terminal interface with live tree visualization  
- 🤖 **GPT-5 Integration** - Latest OpenAI Responses API with grammar constraints
- 📝 **Lark Grammar** - Formal grammar definition ensuring valid AI output
- 🔄 **Runtime Parser** - Dynamic Lark parser generation for command validation
- 📊 **Structured Logging** - Professional Winston-based file logging

### User Interface Features
- 🖥️ **Split-Screen Layout** - Chat interface alongside live tree visualization
- 🎨 **ASCII Tree Display** - Beautiful tree rendering with connection lines
- 📊 **Real-time Statistics** - Node count, depth, and leaf statistics
- ⚡ **Loading Indicators** - Animated spinners during API calls
- 🎯 **Interactive Commands** - Built-in help and exit commands
- 🔄 **Live Updates** - Instant tree modifications as you chat

### Technical Features
- ⚡ **TypeScript** - Full type safety and modern development experience
- 🧪 **Comprehensive Testing** - Jest test suite with 25+ passing tests
- 🔧 **Build System** - Automated grammar parser generation and asset copying
- 🎛️ **Environment Configuration** - Flexible model and API key management
- 📁 **Log Management** - Rotating log files with structured JSON output

## 🏗️ Architecture

### Grammar-First Design
```
User Input (Natural Language) 
    ↓
GPT-5 Responses API + Lark Grammar Tool
    ↓  
Structured Command (Lark-validated)
    ↓
JSON Tree Modification
    ↓
Real-time UI Update
```

### Key Components

#### 1. **Lark Grammar Definition** (`src/grammar/tree-commands.lark`)
```lark
start: command

command: add_cmd | remove_cmd | move_cmd | rename_cmd | set_cmd

// ADD id=nodeId [label="Node Label"] [parent=parentId]
add_cmd: "ADD"i WS "id=" ID (WS attribute)*

// REMOVE id=nodeId  
remove_cmd: "REMOVE"i WS "id=" ID

// MOVE id=nodeId parent=newParentId
move_cmd: "MOVE"i WS "id=" ID WS "parent=" ID

// RENAME id=nodeId label="New Label"
rename_cmd: "RENAME"i WS "id=" ID WS "label=" STRING_VALUE

// SET id=nodeId attribute=value [attribute2=value2]
set_cmd: "SET"i WS "id=" ID (WS attribute)+
```

#### 2. **GPT-5 API Integration** (`src/api/ChatGPTClient.ts`)
- Uses OpenAI's **Responses API** with custom grammar tools
- Implements **Lark syntax** constraints for AI output
- Provides structured logging and error handling
- Supports **tool_choice: 'required'** for guaranteed tool usage

#### 3. **Runtime Parser Generation** (`scripts/generate_lark_parser.py`)
- Converts Lark grammar to JavaScript parser at build time
- Ensures **single source of truth** between API and local validation
- Generates TypeScript-compatible parser with full type safety

#### 4. **Interactive TUI** (`src/ui/TUI.ts`)
- **Blessed.js**-based terminal interface
- Split-screen layout: chat on left, tree visualization on right
- Real-time updates with loading indicators
- ASCII-compatible display for maximum terminal compatibility

**Example Tree Visualization:**
```
Tree Structure:
+-- root (My Project)
    +-- frontend (Frontend Code)
    |   +-- components (UI Components)
    |   +-- pages (Application Pages)
    +-- backend (Backend Services)
        +-- api (REST API)
        +-- database (Data Layer)

Statistics:
Nodes: 7
Max Depth: 3
Leaves: 4
```

## 🛠️ Installation

### Prerequisites
- **Node.js** 18+ 
- **Python 3.7+** (for Lark parser generation)
- **OpenAI API Key** with GPT-5 access

### Setup
```bash
# Clone the repository
git clone <repository-url>
cd cfg-chatgpt-interactions

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY

# Build the project
npm run build

# Run the application
npm start
```

## 🎮 Usage

### Starting the Application
```bash
npm start
```

The application will launch a split-screen terminal interface:
- **Left Panel**: Chat interface for natural language input
- **Right Panel**: Live tree visualization with statistics

### Example Interactions

**User**: "Create a root node called 'My Project'"
**AI Response**: "I'll create a root node for your project."
**Generated Command**: `ADD id=root label="My Project"`

**User**: "Add a settings section under the root"
**AI Response**: "I'll add a settings section to your project."
**Generated Command**: `ADD id=settings label="Settings" parent=root`

**User**: "Move the settings to be a child of configuration"
**AI Response**: "I'll move the settings under the configuration node."
**Generated Command**: `MOVE id=settings parent=configuration`

### Available Commands
- `/help` - Show available commands
- `/exit` or `/quit` - Exit the application
- Any natural language describing tree operations

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test SimpleTreeOps.test.ts
```

### Test Coverage
- **TreeCommandParser**: Grammar parsing and validation
- **SimpleTreeOps**: JSON tree manipulation operations
- **Runtime Parser**: Generated Lark parser functionality

## 📊 Logging

The application uses **Winston** for structured logging with file-only output:

### Log Files
- `logs/combined.log` - All application logs (5MB rotation, 5 files)
- `logs/error.log` - Error-level logs only (5MB rotation, 5 files)  
- `logs/debug.log` - Debug and API logs (10MB rotation, 3 files)

### Log Structure
```json
{
  "level": "info",
  "message": "ChatGPT API response received",
  "model": "gpt-5-nano",
  "usage": {
    "inputTokens": 515,
    "outputTokens": 212
  },
  "duration": 1250,
  "service": "cfg-chatgpt",
  "timestamp": "2025-09-04 09:14:58"
}
```

## 🔬 OpenAI GPT-5 CFG Insights

### Context Free Grammar Revolution
OpenAI's GPT-5 introduces **Context Free Grammar (CFG)** support through the Responses API, enabling:

1. **Guaranteed Structure**: AI output is mathematically guaranteed to conform to specified grammar rules
2. **Lark Syntax Support**: Industry-standard grammar definition language
3. **Tool Integration**: Grammar constraints work seamlessly with function calling
4. **Reduced Hallucination**: Formal constraints eliminate invalid output formats

### Technical Implementation
```typescript
const response = await client.responses.create({
  model: "gpt-5-nano",
  input: userMessage,
  tools: [{
    type: "custom",
    name: "tree_command", 
    format: {
      type: "grammar",
      syntax: "lark",
      definition: larkGrammarString
    }
  }],
  tool_choice: "required"
});
```

### Benefits Over Traditional Approaches
- **No Prompt Engineering**: Grammar rules replace complex prompt instructions
- **Perfect Parsing**: Eliminates JSON parsing errors and malformed responses  
- **Consistent Output**: Same grammar used by API and local validation
- **Scalable Constraints**: Complex grammars support sophisticated data structures

### Performance Characteristics
- **Token Efficiency**: Grammar constraints reduce output tokens
- **Faster Processing**: Structured output eliminates retry loops
- **Predictable Costs**: Consistent output format enables accurate cost estimation

## 🔧 Development

### Project Structure
```
src/
├── api/           # OpenAI API integration
├── core/          # Application engine and logic
├── grammar/       # Lark grammar definitions
├── tests/         # Jest test suites
├── types/         # TypeScript type definitions
├── ui/            # Terminal user interface
└── utils/         # Utilities and helpers

scripts/           # Build and generation scripts
logs/             # Application log files (gitignored)
dist/             # Compiled output (gitignored)
```

### Build Process
1. **TypeScript Compilation**: `tsc` compiles source to JavaScript
2. **Asset Copying**: Grammar files copied to `dist/grammar/`
3. **Parser Generation**: Python script generates runtime Lark parser
4. **Validation**: Generated parser tested for consistency

### Environment Variables
```bash
# Required
OPENAI_API_KEY=your_openai_api_key_here

# Optional  
OPENAI_MODEL=gpt-5-nano  # Default model to use
NODE_ENV=development     # Environment mode
```

## 🚀 Future Enhancements

### Planned Features
- **Multiple Grammar Support**: Switch between different tree schemas
- **Export Functionality**: Save trees to various formats (JSON, XML, YAML)
- **Undo/Redo System**: Command history with rollback capabilities
- **Visual Tree Editor**: Web-based GUI complement to TUI
- **Grammar Validation**: Real-time grammar syntax checking
- **Plugin System**: Extensible grammar and command definitions

### Research Opportunities
- **Grammar Optimization**: Minimize token usage while maintaining expressiveness
- **Multi-Modal Integration**: Combine CFG with vision/audio inputs
- **Collaborative Editing**: Multi-user tree editing with conflict resolution
- **Domain-Specific Languages**: CFG-based DSL generation for various domains

## 📚 References

- [OpenAI GPT-5 Responses API Documentation](https://cookbook.openai.com/examples/gpt-5/gpt-5_new_params_and_tools)
- [Lark Grammar Documentation](https://lark-parser.readthedocs.io/)
- [Context Free Grammar Theory](https://en.wikipedia.org/wiki/Context-free_grammar)
- [Blessed.js Terminal UI Library](https://github.com/chjj/blessed)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guidelines](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

---

**Built with ❤️ using OpenAI GPT-5, TypeScript, and Lark Grammar**
