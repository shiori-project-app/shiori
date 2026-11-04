import fs from 'node:fs';
import path from 'node:path';
import { app } from 'electron';

const MAX_LOG_BYTES = 1024 * 1024;
const LOG_FILE_NAME = 'main.log';
const PREVIOUS_LOG_FILE_NAME = 'main.previous.log';

const logFolder = () => path.join(app.getPath('userData'), 'logs');

const rotateWhenFull = (logFile) => {
  const isFull = fs.existsSync(logFile) && fs.statSync(logFile).size > MAX_LOG_BYTES;

  if (isFull) fs.renameSync(logFile, path.join(logFolder(), PREVIOUS_LOG_FILE_NAME));
};

const describeDetail = (detail) => (detail instanceof Error ? (detail.stack ?? detail.message) : String(detail));

const writeLogLine = (level, message, detail) => {
  try {
    fs.mkdirSync(logFolder(), { recursive: true });

    const logFile = path.join(logFolder(), LOG_FILE_NAME);

    rotateWhenFull(logFile);

    const detailText = detail === undefined ? '' : ` ${describeDetail(detail)}`;

    fs.appendFileSync(logFile, `${new Date().toISOString()} ${level} ${message}${detailText}\n`);

    return true;
  } catch {
    return false;
  }
};

export const logInfo = (message, detail) => writeLogLine('INFO', message, detail);

export const logError = (message, detail) => writeLogLine('ERROR', message, detail);

export const logUnhandledProcessErrors = () => {
  process.on('unhandledRejection', (reason) => logError('Unhandled promise rejection', reason));
  process.on('uncaughtException', (error) => logError('Uncaught exception', error));
};
