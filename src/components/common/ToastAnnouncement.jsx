import { useToastAnnouncement } from '@/hooks/useToastAnnouncement';

export const ToastAnnouncement = () => (
  <div className="sr-only" role="status" aria-live="polite">
    {useToastAnnouncement()}
  </div>
);
