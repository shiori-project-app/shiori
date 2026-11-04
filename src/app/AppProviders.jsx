import { UserDataGate } from '@/app/UserDataGate';
import { AppearanceProvider } from '@/context/AppearanceContext';
import { DownloadsProvider } from '@/context/DownloadsContext';
import { LibraryProvider } from '@/context/LibraryContext';
import { LocalFilesProvider } from '@/context/LocalFilesContext';
import { PreferencesProvider } from '@/context/PreferencesContext';
import { SessionProvider } from '@/context/SessionContext';
import { SettingsProvider } from '@/context/SettingsContext';
import { ToastProvider } from '@/context/ToastContext';
import { TrackingProvider } from '@/context/TrackingContext';

export const AppProviders = ({ children }) => (
  <ToastProvider>
    <AppearanceProvider>
      <PreferencesProvider>
        <SettingsProvider>
          <UserDataGate>
            <LibraryProvider>
              <SessionProvider>
                <DownloadsProvider>
                  <LocalFilesProvider>
                    <TrackingProvider>{children}</TrackingProvider>
                  </LocalFilesProvider>
                </DownloadsProvider>
              </SessionProvider>
            </LibraryProvider>
          </UserDataGate>
        </SettingsProvider>
      </PreferencesProvider>
    </AppearanceProvider>
  </ToastProvider>
);
