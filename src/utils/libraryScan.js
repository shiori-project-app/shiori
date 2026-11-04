const fileSignature = (file) => `${file.path}|${file.inProgress ? 1 : 0}`;

export const isSameScan = (firstScan, secondScan) =>
  firstScan.root === secondScan.root &&
  Boolean(firstScan.isUnreachable) === Boolean(secondScan.isUnreachable) &&
  firstScan.files.length === secondScan.files.length &&
  firstScan.files.every((file, index) => fileSignature(file) === fileSignature(secondScan.files[index]));
