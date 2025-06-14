
// Development configuration
export const DEV_CONFIG = {
  // Set to false in production or when testing real authentication
  DISABLE_AUTH_FOR_DEV: true,
  
  // Default role for development mode - student for Pablo's demo
  DEFAULT_DEV_ROLE: 'student' as 'teacher' | 'student'
};

// Mock user data for development - using Pablo Luis Garcia's real data for student mode
export const MOCK_USER_DATA = {
  teacher: {
    user: {
      id: '233d54d8-7c04-4fbf-889e-9500749a4269',
      email: 'mr.cullen@school.edu',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    profile: {
      id: '233d54d8-7c04-4fbf-889e-9500749a4269',
      email: 'mr.cullen@school.edu',
      full_name: 'Mr. Cullen',
      role: 'teacher' as const,
      teacher_id: 'TCH001',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  },
  student: {
    user: {
      id: 'f2b40ffb-6348-4fa9-ade5-105bd1eb6b26',
      email: 'PabloLuisAlegaGarcia@gmail.com',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    profile: {
      id: 'f2b40ffb-6348-4fa9-ade5-105bd1eb6b26',
      email: 'PabloLuisAlegaGarcia@gmail.com',
      full_name: 'Pablo Luis Garcia',
      role: 'student' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  }
};

// Helper function to check if we're in a development environment
export const isDevEnvironment = () => {
  const isDev = process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost';
  console.log('🔧 Dev environment check:', isDev);
  return isDev;
};

// Helper function to determine if dev auth should be active
export const shouldUseDevAuth = () => {
  const shouldUse = DEV_CONFIG.DISABLE_AUTH_FOR_DEV && isDevEnvironment();
  console.log('🔧 Should use dev auth:', shouldUse, { 
    DISABLE_AUTH_FOR_DEV: DEV_CONFIG.DISABLE_AUTH_FOR_DEV, 
    isDevEnvironment: isDevEnvironment() 
  });
  return shouldUse;
};
