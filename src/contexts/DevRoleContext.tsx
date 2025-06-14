
import React, { createContext, useContext, useState } from 'react';
import { DEV_CONFIG } from '@/config/devConfig';

type DevRole = 'teacher' | 'student';

interface DevRoleContextType {
  currentRole: DevRole;
  setCurrentRole: (role: DevRole) => void;
  isDevMode: boolean;
}

const DevRoleContext = createContext<DevRoleContextType | undefined>(undefined);

export function useDevRole() {
  const context = useContext(DevRoleContext);
  if (context === undefined) {
    throw new Error('useDevRole must be used within a DevRoleProvider');
  }
  return context;
}

export function DevRoleProvider({ children }: { children: React.ReactNode }) {
  const [currentRole, setCurrentRole] = useState<DevRole>(DEV_CONFIG.DEFAULT_DEV_ROLE);
  const isDevMode = DEV_CONFIG.FORCE_NO_AUTH || DEV_CONFIG.DISABLE_AUTH_FOR_DEV;

  console.log('🎭 DevRoleProvider initialized:', { currentRole, isDevMode });

  return (
    <DevRoleContext.Provider value={{ currentRole, setCurrentRole, isDevMode }}>
      {children}
    </DevRoleContext.Provider>
  );
}
