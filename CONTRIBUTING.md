# Contributing to CFG ChatGPT Tree Editor

Thank you for your interest in contributing to this project! This document provides guidelines for contributing to the CFG ChatGPT Tree Editor.

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Python 3.7+ (for Lark parser generation)
- OpenAI API key with GPT-5 access
- Basic understanding of TypeScript, Lark grammars, and terminal UIs

### Development Setup
1. Fork the repository
2. Clone your fork: `git clone <your-fork-url>`
3. Install dependencies: `npm install`
4. Copy `.env.example` to `.env` and add your OpenAI API key
5. Build the project: `npm run build`
6. Run tests: `npm test`

## 🛠️ Development Workflow

### Making Changes
1. Create a feature branch: `git checkout -b feature/your-feature-name`
2. Make your changes
3. Add/update tests as needed
4. Run the test suite: `npm test`
5. Build the project: `npm run build`
6. Test the application: `npm start`

### Code Style
- Follow existing TypeScript conventions
- Use meaningful variable and function names
- Add JSDoc comments for public APIs
- Maintain consistent indentation (2 spaces)
- Use structured logging with Winston instead of console.log

### Testing
- Write tests for new functionality
- Maintain or improve test coverage
- Test files should be in `src/tests/` directory
- Use descriptive test names and organize with `describe` blocks

## 📝 Areas for Contribution

### High Priority
- **Grammar Extensions**: Add new Lark grammar rules for additional tree operations
- **UI Improvements**: Enhance the terminal interface with better visualization
- **Performance Optimization**: Improve API call efficiency and response times
- **Error Handling**: Better error messages and recovery mechanisms

### Medium Priority
- **Export Features**: Add tree export to different formats (XML, YAML, CSV)
- **Undo/Redo System**: Implement command history and rollback
- **Configuration**: More flexible model and parameter configuration
- **Documentation**: Improve inline documentation and examples

### Research & Innovation
- **Multi-Grammar Support**: Support for multiple grammar schemas
- **Grammar Validation**: Real-time Lark grammar syntax checking
- **Advanced Parsing**: More sophisticated tree manipulation commands
- **Integration**: Connect with external data sources or APIs

## 🧪 Testing Guidelines

### Test Categories
1. **Unit Tests**: Test individual functions and classes
2. **Integration Tests**: Test component interactions
3. **Grammar Tests**: Validate Lark parser functionality
4. **API Tests**: Mock OpenAI API interactions

### Running Tests
```bash
# All tests
npm test

# Specific test file
npm test SimpleTreeOps.test.ts

# Watch mode
npm run test:watch
```

## 📋 Pull Request Process

### Before Submitting
- [ ] All tests pass (`npm test`)
- [ ] Build succeeds (`npm run build`)
- [ ] Code follows project style guidelines
- [ ] New features include tests
- [ ] Documentation updated if needed
- [ ] No console.log statements (use Winston logger)

### PR Description Template
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Added/updated tests
- [ ] All tests pass
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No breaking changes (or clearly documented)
```

## 🐛 Bug Reports

### Before Reporting
1. Check existing issues for duplicates
2. Test with the latest version
3. Reproduce the issue consistently

### Bug Report Template
```markdown
## Bug Description
Clear description of the bug

## Steps to Reproduce
1. Step one
2. Step two
3. Step three

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Environment
- OS: [e.g., macOS, Ubuntu]
- Node.js version: [e.g., 18.17.0]
- OpenAI model: [e.g., gpt-5-nano]

## Logs
Relevant log entries from logs/ directory
```

## 💡 Feature Requests

### Feature Request Template
```markdown
## Feature Description
Clear description of the proposed feature

## Use Case
Why is this feature needed?

## Proposed Solution
How should this feature work?

## Alternatives Considered
Other approaches you've considered

## Additional Context
Any other relevant information
```

## 📚 Resources

### Project Architecture
- **Grammar-First Design**: All AI output constrained by Lark grammar
- **Single Source of Truth**: One `.lark` file used by both API and parser
- **File-Only Logging**: Winston logs to files, not console
- **Runtime Parser**: Generated at build time from Lark grammar

### Key Technologies
- **OpenAI GPT-5 Responses API**: CFG-constrained AI responses
- **Lark Grammar**: Formal grammar definition language
- **TypeScript**: Type-safe JavaScript development
- **Blessed.js**: Terminal user interface library
- **Jest**: Testing framework
- **Winston**: Structured logging library

### Useful Links
- [Lark Grammar Tutorial](https://lark-parser.readthedocs.io/en/latest/grammar/)
- [OpenAI GPT-5 Cookbook](https://cookbook.openai.com/examples/gpt-5/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Blessed.js Examples](https://github.com/chjj/blessed#example)

## 🤝 Community

### Communication
- Use GitHub Issues for bug reports and feature requests
- Keep discussions respectful and constructive
- Help other contributors when possible

### Recognition
Contributors will be acknowledged in the project README and release notes.

Thank you for contributing to the CFG ChatGPT Tree Editor! 🎉
