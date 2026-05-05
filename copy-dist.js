// copy-dist.js — copies client/dist next to the exe for distribution
const fs = require('fs');
const path = require('path');

function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDirSync(srcPath, destPath);
    else fs.copyFileSync(srcPath, destPath);
  }
}

const src  = path.join(__dirname, 'client', 'dist');
const dest = path.join(__dirname, 'dist-exe', 'client', 'dist');

console.log(`Copying ${src}\n     -> ${dest}`);
copyDirSync(src, dest);
console.log('Done! Your dist-exe/ folder is ready to distribute.');
console.log('\nDistribute the entire dist-exe/ folder (Whisper.exe + client/dist/)');
