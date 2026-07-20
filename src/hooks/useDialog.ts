'use client';
import { useContext } from 'react';
import { DialogContext, DialogContextValue } from '@/components/DialogProvider';

export function useDialog(): DialogContextValue {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialog must be used within a DialogProvider');
  }
  return context;
}
// trigger ide update
