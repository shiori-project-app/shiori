import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const APP_ICON_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), '../build/icon.png');
