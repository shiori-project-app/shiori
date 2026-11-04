import { useContext } from 'react';
import { TrackingContext } from '@/context/TrackingContext';

export const useTracking = () => useContext(TrackingContext);
