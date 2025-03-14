import { Formik, Field, Form } from 'formik';
import * as Yup from 'yup';
import { useAuth } from '../../context/AuthContext';
import { useState, useEffect } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import PasswordStrengthBar from 'react-password-strength-bar';
import { useNavigate } from 'react-router-dom';
import { trackEvent } from '../../utils/analytics';

const LoginSchema = Yup.object().shape({
  email: Yup.string()
    .email('Please enter a valid email address')
    .required('Email is required')
    .matches(
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      'Email must be in a valid format (e.g., user@example.com)'
    ),
  password: Yup.string()
    .required('Password is required')
    .min(12, 'Password must be at least 12 characters')
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      'Must contain uppercase, lowercase, number, and special character'
    )
});

const LoginForm = () => {
  const { login } = useAuth();
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [recaptchaToken, setRecaptchaToken] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const [failedAttempts, setFailedAttempts] = useState(0);

  useEffect(() => {
    if (failedAttempts >= 3) {
      trackEvent('Login_Lockout_Attempt');
    }
  }, [failedAttempts]);

  const handleSubmit = async (values, { setFieldError }) => {
    setIsSubmitting(true);
    try {
      if (!recaptchaToken) {
        throw new Error('Please complete the reCAPTCHA');
      }

      await login({
        ...values,
        recaptchaToken
      });

      trackEvent('Login_Success');
      navigate('/dashboard');
    } catch (err) {
      setFailedAttempts(prev => prev + 1);
      trackEvent('Login_Failed', { error: err.message });

      const errorMessage = err.response?.data?.error || 'Login failed. Please try again.';
      
      if (err.response?.status === 401) {
        setFieldError('password', ' ');
        setFieldError('email', ' ');
        setError(errorMessage);
      } else if (err.response?.status === 429) {
        setError('Too many attempts. Please try again later.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Formik
      initialValues={{ email: '', password: '' }}
      validationSchema={LoginSchema}
      onSubmit={handleSubmit}
    >
      {({ errors, touched, values }) => (
        <Form className="space-y-6" noValidate>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email address
            </label>
            <Field
              name="email"
              type="email"
              autoComplete="email"
              aria-describedby="email-error"
              className={`mt-1 block w-full rounded-md border ${
                errors.email && touched.email ? 'border-red-500' : 'border-gray-300'
              } shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm`}
            />
            {errors.email && touched.email && (
              <p id="email-error" className="mt-2 text-sm text-red-600">
                {errors.email}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <div className="relative mt-1">
              <Field
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                aria-describedby="password-error"
                className={`block w-full rounded-md border ${
                  errors.password && touched.password ? 'border-red-500' : 'border-gray-300'
                } shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                ) : (
                  <EyeIcon className="h-5 w-5 text-gray-400" />
                )}
              </button>
            </div>
            {values.password && (
              <PasswordStrengthBar
                password={values.password}
                className="mt-2"
                scoreWords={['Weak', 'Weak', 'Fair', 'Good', 'Strong']}
                shortScoreWord="Too short"
              />
            )}
            {errors.password && touched.password && (
              <p id="password-error" className="mt-2 text-sm text-red-600">
                {errors.password}
              </p>
            )}
          </div>

          <ReCAPTCHA
            sitekey={process.env.REACT_APP_RECAPTCHA_SITE_KEY}
            onChange={token => setRecaptchaToken(token)}
            className="mt-4"
          />

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="flex items-center justify-between">
            <a
              href="/forgot-password"
              className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
            >
              Forgot password?
            </a>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !recaptchaToken}
            className="flex w-full justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Signing in...
              </span>
            ) : (
              'Sign in'
            )}
          </button>
        </Form>
      )}
    </Formik>
  );
};

export default LoginForm;