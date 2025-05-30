const fs = require('fs');
const path = require('path');
const { app } = require('electron');

// Get the user data directory
const userDataPath = app.getPath('userData');
const visualizersPath = path.join(userDataPath, 'visualizers');

// Create visualizers directory if it doesn't exist
if (!fs.existsSync(visualizersPath)) {
  fs.mkdirSync(visualizersPath, { recursive: true });
}

// Copy the image inverter visualizer
const sourcePath = path.join(__dirname, '../visualizers/image-inverter');
const targetPath = path.join(visualizersPath, 'image-inverter');

// Remove existing visualizer if it exists
if (fs.existsSync(targetPath)) {
  fs.rmSync(targetPath, { recursive: true, force: true });
}

// Copy the visualizer
fs.cpSync(sourcePath, targetPath, { recursive: true });

console.log('Visualizers copied successfully!');