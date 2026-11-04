import { useContext } from 'react';
import { AppearanceContext } from '@/context/AppearanceContext';

export const useAppearance = () => useContext(AppearanceContext);
