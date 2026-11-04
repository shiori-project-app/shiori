import { HashRouter } from 'react-router';
import { AppProviders } from '@/app/AppProviders';
import { AppRoutes } from '@/app/AppRoutes';
import { OfflineSync } from '@/app/OfflineSync';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

const NothingVisible = () => null;

export const App = () => (
  <ErrorBoundary>
    <AppProviders>
      <ErrorBoundary fallback={NothingVisible}>
        <OfflineSync />
      </ErrorBoundary>

      <HashRouter>
        <AppRoutes />
      </HashRouter>
    </AppProviders>
  </ErrorBoundary>
);
