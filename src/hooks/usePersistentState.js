import { useEffect, useState } from 'react';
import { userDataStore } from '@/api/services/userDataStore';
import { storage } from '@/utils/storage';

const useStateSavedTo = (store, key, initialValue) => {
  const [value, setValue] = useState(() => store.get(key, undefined) ?? initialValue);

  useEffect(() => {
    store.set(key, value);
  }, [store, key, value]);

  return [value, setValue];
};

export const usePersistentState = (key, initialValue) => useStateSavedTo(storage, key, initialValue);

export const useUserDataState = (key, initialValue) => useStateSavedTo(userDataStore, key, initialValue);
