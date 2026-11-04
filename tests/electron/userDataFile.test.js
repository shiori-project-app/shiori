import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  backupPathFor,
  createUserDataFile,
  LOAD_STATUS,
  NEWER_FORMAT_ERROR_CODE,
} from '../../electron/userDataFile.js';
import { USER_DATA_FORMAT_VERSION } from '../../shared/userDataFiles.js';

const SAVE_DELAY_MS = 1000;

let testFolder = '';
let filePath = '';

const writeDocument = (targetPath, data, format = USER_DATA_FORMAT_VERSION) =>
  fs.writeFileSync(targetPath, JSON.stringify({ format, savedAt: '2026-11-01T00:00:00.000Z', data }));

const readDocument = (targetPath) => JSON.parse(fs.readFileSync(targetPath, 'utf8'));

const openFile = (onSaveFailed = vi.fn()) => createUserDataFile({ filePath, saveDelayMs: SAVE_DELAY_MS, onSaveFailed });

describe('user data files', () => {
  beforeEach(() => {
    testFolder = fs.mkdtempSync(path.join(os.tmpdir(), 'shiori-user-data-'));
    filePath = path.join(testFolder, 'data', 'library.json');
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    fs.rmSync(testFolder, { recursive: true, force: true });
  });

  it('reports a missing file so the page can migrate, and stays missing until something is written', () => {
    const userDataFile = openFile();

    expect(userDataFile.load()).toEqual({ status: LOAD_STATUS.missing, data: {} });
    expect(userDataFile.load().status).toBe(LOAD_STATUS.missing);
    userDataFile.replace({ list: { 1: { status: 'watching' } } });
    expect(userDataFile.load()).toEqual({ status: LOAD_STATUS.loaded, data: { list: { 1: { status: 'watching' } } } });
  });

  it('writes a versioned document and keeps the previous version as .bak', () => {
    writeDocument(filePath, { watched: { 1: [1] } });

    const userDataFile = openFile();

    userDataFile.load();
    userDataFile.replace({ watched: { 1: [1, 2] } });

    expect(readDocument(filePath)).toMatchObject({
      format: USER_DATA_FORMAT_VERSION,
      data: { watched: { 1: [1, 2] } },
    });

    expect(readDocument(backupPathFor(filePath)).data).toEqual({ watched: { 1: [1] } });
  });

  it('batches changes into one save after the delay, and flushes pending changes on quit', () => {
    vi.useFakeTimers();

    const userDataFile = openFile();

    userDataFile.load();
    userDataFile.set('list', { 1: {} });
    userDataFile.set('notes', { '1-1': [] });
    expect(fs.existsSync(filePath)).toBe(false);
    vi.advanceTimersByTime(SAVE_DELAY_MS);
    expect(readDocument(filePath).data).toEqual({ list: { 1: {} }, notes: { '1-1': [] } });
    userDataFile.set('list', {});
    userDataFile.flush();
    expect(readDocument(filePath).data.list).toEqual({});
  });

  it('loads the file before applying a change, so a change never drops what was already saved', () => {
    vi.useFakeTimers();
    writeDocument(filePath, { list: { 1: {} } });

    const userDataFile = openFile();

    userDataFile.set('watched', { 1: [3] });
    userDataFile.flush();
    expect(readDocument(filePath).data).toEqual({ list: { 1: {} }, watched: { 1: [3] } });
  });

  it('falls back to .bak when the file is damaged, and sets the damaged file aside', () => {
    vi.useFakeTimers();
    fs.writeFileSync(filePath, '{"format":1,"data":{"li');
    writeDocument(backupPathFor(filePath), { list: { 7: {} } });

    const userDataFile = openFile();
    const result = userDataFile.load();

    expect(result.status).toBe(LOAD_STATUS.restoredFromBackup);
    expect(result.data).toEqual({ list: { 7: {} } });
    expect(fs.readdirSync(path.dirname(filePath)).some((fileName) => fileName.includes('.unreadable-'))).toBe(true);
    vi.advanceTimersByTime(SAVE_DELAY_MS);
    expect(readDocument(filePath).data).toEqual({ list: { 7: {} } });
    expect(readDocument(backupPathFor(filePath)).data).toEqual({ list: { 7: {} } });
  });

  it('starts fresh when both copies are unreadable, keeping the damaged file', () => {
    fs.writeFileSync(filePath, 'not json');
    fs.writeFileSync(backupPathFor(filePath), JSON.stringify({ unrelated: true }));

    const result = openFile().load();

    expect(result.status).toBe(LOAD_STATUS.unreadable);
    expect(result.data).toEqual({});
    expect(fs.existsSync(filePath)).toBe(false);
  });

  it('refuses to open or overwrite a file written by a newer version', () => {
    writeDocument(filePath, { list: {} }, USER_DATA_FORMAT_VERSION + 1);

    const userDataFile = openFile();

    expect(() => userDataFile.load()).toThrow(expect.objectContaining({ code: NEWER_FORMAT_ERROR_CODE }));
    expect(() => userDataFile.set('list', { 1: {} })).toThrow(/newer version/);
    expect(readDocument(filePath).format).toBe(USER_DATA_FORMAT_VERSION + 1);
  });

  it('keeps retrying a failed save, reports it once, and leaves no temporary file behind', () => {
    vi.useFakeTimers();

    const onSaveFailed = vi.fn();

    const userDataFile = createUserDataFile({
      filePath,
      saveDelayMs: SAVE_DELAY_MS,
      saveRetryDelayMs: 1000,
      onSaveFailed,
    });

    userDataFile.load();
    fs.mkdirSync(filePath);
    fs.writeFileSync(path.join(filePath, 'blocker'), '');
    userDataFile.set('notes', { first: [] });

    vi.advanceTimersByTime(SAVE_DELAY_MS);
    vi.advanceTimersByTime(1000);
    expect(onSaveFailed).toHaveBeenCalledTimes(1);

    fs.rmSync(filePath, { recursive: true });
    vi.advanceTimersByTime(1000);
    expect(readDocument(filePath).data).toEqual({ notes: { first: [] } });
    expect(fs.readdirSync(path.dirname(filePath)).filter((name) => name.endsWith('.tmp'))).toEqual([]);
  });

  it('still saves on quit after an earlier save failed', () => {
    vi.useFakeTimers();

    const userDataFile = openFile();

    userDataFile.load();
    fs.mkdirSync(filePath);
    fs.writeFileSync(path.join(filePath, 'blocker'), '');
    userDataFile.set('notes', { first: [] });
    vi.advanceTimersByTime(SAVE_DELAY_MS);

    fs.rmSync(filePath, { recursive: true });
    userDataFile.flush();
    expect(readDocument(filePath).data).toEqual({ notes: { first: [] } });
  });

  it('saves even when the backup copy cannot be made', () => {
    const onBackupFailed = vi.fn();

    const userDataFile = createUserDataFile({
      filePath,
      saveDelayMs: SAVE_DELAY_MS,
      onSaveFailed: vi.fn(),
      onBackupFailed,
    });

    userDataFile.replace({ notes: { first: [] } });
    fs.mkdirSync(`${filePath}.bak`);

    userDataFile.replace({ notes: { second: [] } });
    expect(onBackupFailed).toHaveBeenCalledTimes(1);
    expect(readDocument(filePath).data).toEqual({ notes: { second: [] } });
  });

  it('reports a failed batched save instead of throwing', () => {
    vi.useFakeTimers();

    const onSaveFailed = vi.fn();
    const userDataFile = openFile(onSaveFailed);

    userDataFile.load();
    fs.rmSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(path.dirname(filePath), 'a file where the folder should be');
    userDataFile.set('list', {});
    vi.advanceTimersByTime(SAVE_DELAY_MS);
    expect(onSaveFailed).toHaveBeenCalledOnce();
  });
});
