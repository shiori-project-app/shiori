import { useContext } from 'react';
import { ToastAnnouncementContext } from '@/context/ToastContext';

export const useToastAnnouncement = () => useContext(ToastAnnouncementContext);
