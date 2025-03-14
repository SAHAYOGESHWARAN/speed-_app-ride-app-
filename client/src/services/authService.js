import API, { createCancelToken, API_ERRORS } from './api';
import { encryptPayload } from './cryptoUtils';
import { generateDeviceId } from './deviceUtils';
import { trackEvent } from './analytics';

const AuthService = {
  login: async (credentials, mfaCode = null) => {
    try {
      const source = createCancelToken();
      const encryptedCredentials = encryptPayload({
        ...credentials,
        deviceId: generateDeviceId()
      });

      const { data } = await API.post('/auth/login', {
        ...encryptedCredentials,
        mfaCode
      }, {
        cancelToken: source.token,
        headers: {
          'X-Request-Fingerprint': generateDeviceId()
        }
      });

      trackEvent('login_success');
      return {
        user: data.user,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresIn: data.expiresIn
      };
    } catch (error) {
      trackEvent('login_failed', { error: error.code });
      throw handleAuthError(error);
    }
  },

  register: async (userData) => {
    try {
      const source = createCancelToken();
      const encryptedData = encryptPayload(userData);

      const { data } = await API.post('/auth/register', encryptedData, {
        cancelToken: source.token,
        headers: {
          'X-Request-Fingerprint': generateDeviceId()
        }
      });

      trackEvent('registration_success');
      return {
        user: data.user,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresIn: data.expiresIn
      };
    } catch (error) {
      trackEvent('registration_failed', { error: error.code });
      throw handleAuthError(error);
    }
  },

  getMe: async () => {
    try {
      const source = createCancelToken();
      const { data } = await API.get('/users/me', {
        cancelToken: source.token,
        headers: {
          'X-Consistent-Level': 'strong'
        }
      });
      return data;
    } catch (error) {
      throw handleAuthError(error);
    }
  },

  refreshToken: async (refreshToken) => {
    try {
      const source = createCancelToken();
      const { data } = await API.post('/auth/refresh', { refreshToken }, {
        cancelToken: source.token,
        headers: {
          'X-Refresh-Request': 'true'
        }
      });
      return data;
    } catch (error) {
      throw handleAuthError(error);
    }
  },

  logout: async (everywhere = false) => {
    try {
      const source = createCancelToken();
      await API.post('/auth/logout', { everywhere }, {
        cancelToken: source.token
      });
      trackEvent('logout');
    } catch (error) {
      trackEvent('logout_failed', { error: error.code });
      throw handleAuthError(error);
    }
  },

  requestPasswordReset: async (email) => {
    try {
      const source = createCancelToken();
      await API.post('/auth/password-reset', { email }, {
        cancelToken: source.token
      });
      trackEvent('password_reset_requested');
    } catch (error) {
      throw handleAuthError(error);
    }
  },

  verifyMFA: async (code, method = 'totp') => {
    try {
      const source = createCancelToken();
      const { data } = await API.post('/auth/mfa/verify', { code, method }, {
        cancelToken: source.token
      });
      return data;
    } catch (error) {
      throw handleAuthError(error);
    }
  }
};

const handleAuthError = (error) => {
  const normalizedError = {
    code: error.code || API_ERRORS.UNKNOWN_ERROR,
    message: error.message || 'Authentication failed',
    status: error.status,
    retryable: isRetryableError(error.code)
  };

  if (error.response?.data?.details) {
    normalizedError.details = error.response.data.details;
  }

  return normalizedError;
};

const isRetryableError = (code) => {
  const retryableCodes = [
    API_ERRORS.NETWORK_ERROR,
    API_ERRORS.TIMEOUT_ERROR,
    API_ERRORS.SERVER_ERROR
  ];
  return retryableCodes.includes(code);
};

export default AuthService;