import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@/app/App';
import { DEFAULT_PREFERENCES, PREFERENCES_KEY } from '@/constants/preferences';
import { DEFAULT_APPEARANCE } from '@/constants/themes';
import { applyAppearance } from '@/utils/appearance';
import { applyReduceMotion } from '@/utils/motion';
import { storage } from '@/utils/storage';
import '@/styles/fonts';
import '@/styles/main.scss';

applyAppearance(storage.get('appearance', DEFAULT_APPEARANCE));
applyReduceMotion(storage.get(PREFERENCES_KEY, DEFAULT_PREFERENCES).reduceMotion);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
