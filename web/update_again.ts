import fs from 'fs';
let content = fs.readFileSync('src/app/dashboard/page.tsx', 'utf8');

const regex = /const style = URGENCY_STYLE\[item\.urgency\] \?\? URGENCY_STYLE\.low;/;
content = content.replace(regex, 'const style = ACTION_STYLE[item.type] ?? ACTION_STYLE.mention;');

// Clean redundant declarations
content = content.replace(/const URGENCY_STYLE[^\}]+};\n/, ""); // Just removing any leftover if failed earlier

fs.writeFileSync('src/app/dashboard/page.tsx', content);
