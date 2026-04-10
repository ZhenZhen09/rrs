
const fs = require('fs');
const glob = require('glob');

function checkFiles(pattern) {
  const files = glob.sync(pattern);
  console.log(`Checking ${files.length} files for ${pattern}`);
  files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    // Simple regex to find <p and then <div before </p>
    const regex = /<p[^>]*>([\s\S]*?)<\/p>/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      const pContent = match[1];
      if (pContent.includes('<div')) {
        const upToMatch = content.substring(0, match.index);
        const line = upToMatch.split('\n').length;
        console.log(`Found illegal nesting in ${file} at line ${line}`);
        console.log('--- Content ---');
        console.log(match[0]);
        console.log('---------------');
      }
    }
  });
}

console.log('Checking src/app/components/**/*.tsx');
checkFiles('src/app/components/**/*.tsx');
console.log('Checking mobile-app/**/*.tsx');
checkFiles('mobile-app/**/*.tsx');
