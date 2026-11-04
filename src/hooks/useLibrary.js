import { useContext } from 'react';
import { LibraryContext, PlaybackProgressContext } from '@/context/LibraryContext';

export const useLibrary = () => useContext(LibraryContext);

export const usePlaybackProgress = () => useContext(PlaybackProgressContext);
