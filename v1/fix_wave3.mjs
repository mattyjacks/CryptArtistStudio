// Fix duplicate aria-label and update all-prompts.md
import fs from 'fs';
import path from 'path';

// Fix duplicate aria-label attributes
const fixFiles = [
  'src/components/SuiteLauncher.tsx',
  'src/programs/demo-recorder/DemoRecorder.tsx',
];

for (const f of fixFiles) {
  const fp = path.resolve(f);
  if (!fs.existsSync(fp)) continue;
  let c = fs.readFileSync(fp, 'utf8');
  const before = c;
  // Fix: aria-label="Action Button" ... aria-label="Close" -> aria-label="Close" ...
  c = c.replace(/aria-label="Action Button"([^>]*?) aria-label="Close"/g, 'aria-label="Close"$1');
  if (c !== before) {
    fs.writeFileSync(fp, c);
    console.log('Fixed duplicate aria-label:', f);
  }
}

console.log('Done fixing aria-label issues');
