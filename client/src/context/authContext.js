import { createContext, useContext } from 'react';

export const AuthContext = createContext(null);

// Convenience hook - always wrap the app in <AuthProvider> first
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
