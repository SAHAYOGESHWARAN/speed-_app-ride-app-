import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../services/authService';
import { eventBus } from '../utils/eventBus';
import { destroySession, persistSession, retrieveSession } from '../utils/sessionManager';
import { handleError } from '../utils/errorHandler';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [authState, setAuthState] = useState({
    user: null,
    token: null,
    loading: true,
    mfaRequired: false
  });
  const navigate = useNavigate();
  const inactivityTimeout = 30 * 60 * 1000; // 30 minutes

  const handleInactive = useCallback(() => {
    eventBus.emit('showToast', 'Session expired due to inactivity');
    logout();
  }, []);

  const resetInactivityTimer = useCallback(() => {
    let timer;
    const startTimer = () => {
      timer = setTimeout(handleInactive, inactivityTimeout);
    };

    const events = ['mousemove', 'keydown', 'scroll', 'click'];
    events.forEach(event => window.addEventListener(event, startTimer));
    startTimer();

    return () => {
      clearTimeout(timer);
      events.forEach(event => window.removeEventListener(event, startTimer));
    };
  }, [handleInactive, inactivityTimeout]);

  const initializeAuth = useCallback(async () => {
    try {
      const session = retrieveSession();
      if (session) {
        const { user, token } = await authService.verifySession(session.token);
        setAuthState({ user, token, loading: false, mfaRequired: false });
        eventBus.emit('authStateChanged', { isAuthenticated: true });
      }
    } catch (error) {
      destroySession();
      setAuthState(prev => ({ ...prev, loading: false }));
      handleError(error);
    }
  }, []);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  const login = async (credentials, mfaCode) => {
    try {
      setAuthState(prev => ({ ...prev, loading: true }));
      
      const response = await authService.login(credentials);
      
      if (response.mfaRequired) {
        return setAuthState({
          user: null,
          token: null,
          loading: false,
          mfaRequired: true
        });
      }

      if (mfaCode) {
        await authService.verifyMFA(response.tempToken, mfaCode);
      }

      const { user, token, refreshToken } = response;
      persistSession({ user, token, refreshToken });
      
      setAuthState({ user, token, loading: false, mfaRequired: false });
      resetInactivityTimer();
      navigate('/dashboard');
    } catch (error) {
      setAuthState(prev => ({ ...prev, loading: false }));
      handleError(error);
      throw error;
    }
  };

  const logout = (silent = false) => {
    destroySession();
    setAuthState({ user: null, token: null, loading: false, mfaRequired: false });
    if (!silent) {
      navigate('/login');
      eventBus.emit('authStateChanged', { isAuthenticated: false });
    }
  };

  const refreshToken = async () => {
    try {
      const session = retrieveSession();
      if (!session?.refreshToken) throw new Error('No refresh token available');
      
      const { token, refreshToken } = await authService.refreshToken(session.refreshToken);
      persistSession({ ...session, token, refreshToken });
      setAuthState(prev => ({ ...prev, token }));
      return token;
    } catch (error) {
      logout(true);
      throw error;
    }
  };

  const hasPermission = (requiredPermissions) => {
    if (!authState.user?.permissions) return false;
    return requiredPermissions.every(perm => 
      authState.user.permissions.includes(perm)
    );
  };

  const value = {
    ...authState,
    login,
    logout,
    refreshToken,
    hasPermission,
    resetInactivityTimer
  };

  return (
    <AuthContext.Provider value={value}>
      {!authState.loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};