
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
      id: '233d54d8-7c04-4fbf-889e-9500749a4269', // Using existing Mr. Cullen UUID from database
      email: 'mr.cullen@school.edu',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    profile: {
      id: '233d54d8-7c04-4fbf-889e-9500749a4269', // Using existing Mr. Cullen UUID from database
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
      id: 'f2b40ffb-6348-4fa9-ade5-105bd1eb6b26', // Pablo's real ID
      email: 'PabloLuisAlegaGarcia@gmail.com', // Pablo's real email
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    profile: {
      id: 'f2b40ffb-6348-4fa9-ade5-105bd1eb6b26', // Pablo's real ID
      email: 'PabloLuisAlegaGarcia@gmail.com', // Pablo's real email
      full_name: 'Pablo Luis Garcia', // Pablo's real name
      role: 'student' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  }
};

// Helper function to check if we're in a development environment
export const isDevEnvironment = () => {
  return process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost';
};

// Helper function to determine if dev auth should be active
export const shouldUseDevAuth = () => {
  return DEV_CONFIG.DISABLE_AUTH_FOR_DEV && isDevEnvironment();
};
