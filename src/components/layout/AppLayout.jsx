import { Suspense, useLayoutEffect } from 'react';
import { Outlet, useLocation } from 'react-router';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { Header } from '@/components/layout/Header';
import { OfflineBanner } from '@/components/layout/OfflineBanner';

const useScrollToTopOnNavigation = (pathname, search) => {
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname, search]);
};

export const AppLayout = () => {
  const { pathname, search } = useLocation();

  useScrollToTopOnNavigation(pathname, search);

  return (
    <>
      <Header />

      <main className="main">
        <OfflineBanner />

        <ErrorBoundary resetKey={pathname + search}>
          <Suspense fallback={null}>
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      </main>
    </>
  );
};
