// Fix spellCheck injection issues from wave 2
import fs from 'fs';
import path from 'path';

const filesToFix = [
  'src/components/SettingsModal.tsx',
  'src/components/SuiteLauncher.tsx',
  'src/programs/donate-computer/DonateComputer.tsx',
  'src/programs/donate-personal-seconds/DonatePersonalSeconds.tsx',
];

let fixCount = 0;
for (const f of filesToFix) {
  const fp = path.resolve(f);
  if (!fs.existsSync(fp)) continue;
  let code = fs.readFileSync(fp, 'utf8');
  
  // The wave2 script incorrectly added spellCheck={false} inside arrow functions
  // Pattern: (e) = spellCheck={false}> should be (e) =>
  // The regex replaced /> at end of input tags that had font-mono class
  // We need to find and remove the broken `spellCheck={false}` insertions
  
  // Fix: remove " spellCheck={false}" that got injected into non-input contexts
  // The issue is the regex matched things inside onChange handlers
  const before = code;
  
  // Fix pattern: = spellCheck={false}>  (broken arrow function)
  code = code.replace(/\(e\)\s*=\s*spellCheck=\{false\}>/g, '(e) =>');
  
  // Fix pattern: / spellCheck={false}> (broken self-closing tag becoming regular)
  code = code.replace(/\/\s*spellCheck=\{false\}>/g, '/>');
  
  if (code !== before) {
    fs.writeFileSync(fp, code);
    fixCount++;
    console.log(`Fixed: ${f}`);
  }
}

console.log(`Fixed ${fixCount} files`);
