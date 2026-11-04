import { StartupScreen } from '@/components/layout/StartupScreen';
import { useUserDataLoad } from '@/hooks/useUserDataLoad';

export const UserDataGate = ({ children }) => {
  const { status, error, retry } = useUserDataLoad();

  return status === 'ready' ? children : <StartupScreen error={error} onRetry={retry} />;
};
