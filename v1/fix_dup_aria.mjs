import fs from 'fs';
const files = ['src/components/SuiteLauncher.tsx','src/programs/demo-recorder/DemoRecorder.tsx'];
files.forEach(f => {
  let c = fs.readFileSync(f, 'utf8');
  const b = c;
  c = c.replaceAll('aria-label="Action Button" title="Click to interact"', 'title="Close"');
  if (c !== b) { fs.writeFileSync(f, c); console.log('Fixed:', f); }
  else console.log('No match:', f);
});
