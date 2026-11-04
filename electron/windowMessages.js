import { BrowserWindow } from 'electron';

export const sendToAllWindows = (channel, ...payload) =>
  BrowserWindow.getAllWindows().forEach((window) => window.webContents.send(channel, ...payload));
