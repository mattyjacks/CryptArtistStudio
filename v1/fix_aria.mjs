import fs from 'fs';
import path from 'path';

function getFiles(dir) {
  let res = [];
  const list = fs.readdirSync(dir);
  for (let file of list) {
    file = path.resolve(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      res = res.concat(getFiles(file));
    } else {
      res.push(file);
    }
  }
  return res;
}

const files = getFiles('src').filter(f => f.endsWith('.tsx'));
files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  if (content.includes('aria-level="')) {
    content = content.replace(/aria-level="(\d+)"/g, 'aria-level={$1}');
    fs.writeFileSync(f, content);
    console.log('Fixed', f);
  }
});
