#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read the TEMPLATE_RUNNER.md file
const templatePath = path.join(__dirname, 'TEMPLATE_RUNNER.md');
const outputDir = path.join(__dirname, 'generated');

if (!fs.existsSync(templatePath)) {
  console.error('TEMPLATE_RUNNER.md not found in current directory');
  process.exit(1);
}

const content = fs.readFileSync(templatePath, 'utf-8');

// Regular expression to match RunnerArtifact sections
const artifactRegex = /<RunnerArtifact name="([^"]+)">\s*([\s\S]*?)\s*<\/RunnerArtifact>/g;

// Create output directory
if (fs.existsSync(outputDir)) {
  fs.rmSync(outputDir, { recursive: true, force: true });
}
fs.mkdirSync(outputDir, { recursive: true });

let match;
let fileCount = 0;

console.log('Extracting RunnerArtifacts from TEMPLATE_RUNNER.md...\n');

while ((match = artifactRegex.exec(content)) !== null) {
  const fileName = match[1];
  const fileContent = match[2];

  const fullPath = path.join(outputDir, fileName);
  const dir = path.dirname(fullPath);

  // Create directory if it doesn't exist
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Write the file
  fs.writeFileSync(fullPath, fileContent);

  console.log(`✓ Created: ${fileName}`);
  fileCount++;
}

console.log(`\n🎉 Successfully extracted ${fileCount} files to ./generated/`);
console.log('\nTo build the sample runner:');
console.log('cd generated');
console.log('npm install');
console.log('npm run build');