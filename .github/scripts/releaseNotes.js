const VERSION_HEADING = /^## /;

export const changesForVersion = (changelog, version) => {
  const lines = changelog.replace(/\r\n/g, '\n').split('\n');
  const headingIndex = lines.indexOf(`## ${version}`);

  if (headingIndex === -1) throw new Error(`CHANGELOG.md has no "## ${version}" section.`);

  const linesAfterHeading = lines.slice(headingIndex + 1);
  const nextHeadingOffset = linesAfterHeading.findIndex((line) => VERSION_HEADING.test(line));

  const sectionLines = nextHeadingOffset === -1 ? linesAfterHeading : linesAfterHeading.slice(0, nextHeadingOffset);
  const changes = sectionLines.join('\n').trim();

  if (!changes) throw new Error(`The "## ${version}" section of CHANGELOG.md is empty.`);

  return changes;
};

export const releaseNotes = (template, changelog, version) =>
  template.replaceAll('{{version}}', version).replace('{{changes}}', () => changesForVersion(changelog, version));
