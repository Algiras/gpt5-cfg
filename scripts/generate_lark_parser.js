#!/usr/bin/env node
/**
 * Generate a JavaScript Lark parser from tree-commands.lark grammar file.
 * This script uses the lark-js Python package to generate a raw JavaScript parser.
 * 
 * Based on: https://github.com/lark-parser/Lark.js/
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Get project paths
const projectRoot = path.dirname(__dirname);
const grammarPath = path.join(projectRoot, 'src', 'grammar', 'tree-commands.lark');
const outputPath = path.join(projectRoot, 'dist', 'LarkParser.js');

function checkLarkJsInstalled() {
  try {
    execSync('lark-js --help', { stdio: 'ignore', timeout: 5000 });
    return true;
  } catch (error) {
    return false;
  }
}

function installLarkJs() {
  console.log('📦 Installing lark-js and compatible lark version...');
  try {
    // Install lark-js and ensure compatible lark version
    execSync('pip install "lark<=1.1.5" lark-js --upgrade', { stdio: 'inherit' });
    console.log('✅ lark-js installed successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to install lark-js:', error.message);
    return false;
  }
}

function generateJsParser() {
  console.log(`🚀 Generating JavaScript parser from: ${grammarPath}`);
  console.log(`📁 Output will be written to: ${outputPath}`);
  
  try {
    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Generate the parser using lark-js with contextual lexer
    execSync(`lark-js "${grammarPath}" -o "${outputPath}" -l contextual`, { 
      stdio: 'inherit' 
    });
    
    console.log('✅ JavaScript parser generated successfully');
    return true;
    
  } catch (error) {
    console.error('❌ Failed to generate parser:', error.message);
    return false;
  }
}

function main() {
  console.log('🚀 Generating Lark.js parser...');
  console.log(`📄 Grammar file: ${grammarPath}`);
  console.log(`📁 Output file: ${outputPath}`);
  
  // Verify grammar file exists
  if (!fs.existsSync(grammarPath)) {
    console.error(`❌ Grammar file not found: ${grammarPath}`);
    return false;
  }
  
  // Check if lark-js is installed
  if (!checkLarkJsInstalled()) {
    console.log('lark-js not found. Installing...');
    if (!installLarkJs()) {
      return false;
    }
  }
  
  // Generate the JavaScript parser
  if (!generateJsParser()) {
    return false;
  }
  
  console.log('🎉 Lark.js parser generation completed!');
  console.log(`📁 Raw parser available at: ${outputPath}`);
  console.log('🔧 Use get_parser() to create parser instances in TypeScript');
  
  return true;
}

// Run if called directly
if (require.main === module) {
  const success = main();
  process.exit(success ? 0 : 1);
}

module.exports = { main };