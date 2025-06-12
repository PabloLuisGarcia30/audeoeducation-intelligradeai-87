
import React from 'react';
import { TrailblazerSessionRunner } from '@/components/TrailblazerSessionRunner';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { DEV_CONFIG } from '@/config/devConfig';

const TrailblazerSession = () => {
  return (
    <ProtectedRoute requiredRole={DEV_CONFIG.DISABLE_AUTH_FOR_DEV ? undefined : "student"}>
      <TrailblazerSessionRunner />
    </ProtectedRoute>
  );
};

export default TrailblazerSession;
