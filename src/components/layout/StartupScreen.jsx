import { APP_NAME } from '@/config/app.config';

const StartupError = ({ error, onRetry }) => (
  <div className="startup-screen__error" role="alert">
    <p>Shiori couldn’t open your library. {error.message}</p>

    <button type="button" className="btn btn--primary" onClick={onRetry}>
      Try again
    </button>
  </div>
);

export const StartupScreen = ({ error, onRetry }) => (
  <main className="startup-screen">
    <span className="startup-screen__name">{APP_NAME.toUpperCase()}</span>

    {error ? (
      <StartupError error={error} onRetry={onRetry} />
    ) : (
      <span className="startup-screen__spinner" role="status" aria-label="Loading your library" />
    )}
  </main>
);
