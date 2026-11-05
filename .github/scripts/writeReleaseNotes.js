import fs from 'node:fs';
import { releaseNotes } from './releaseNotes.js';

const [version, outputFile] = process.argv.slice(2);

if (!version || !outputFile) {
  process.stderr.write('Usage: node writeReleaseNotes.js <version> <output file>\n');
  process.exit(1);
}

try {
  const template = fs.readFileSync('.github/release-notes-template.md', 'utf8');
  const changelog = fs.readFileSync('CHANGELOG.md', 'utf8');

  fs.writeFileSync(outputFile, releaseNotes(template, changelog, version));
} catch (error) {
  process.stderr.write(`::error::${error.message}\n`);
  process.exit(1);
}
