import { useState } from 'react';
import { Formik, Field, Form } from 'formik';
import * as Yup from 'yup';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { FaGoogle, FaGithub, FaLock, FaEnvelope, FaEye, FaEyeSlash } from 'react-icons/fa';
import ReCAPTCHA from 'react-google-recaptcha';
import Loader from '../components/Loader';
import PasswordStrength from '../components/PasswordStrength';
import { rateLimit } from '../utils/rateLimiter';

const LoginSchema = Yup.object().shape({
  email: Yup.string()
    .email('Invalid email address')
    .required('Required')
    .matches(/@/, 'Invalid email format'),
  password: Yup.string()
    .required('Required')
    .min(12, 'Must be at least 12 characters')
    .matches(/[A-Z]/, 'Requires uppercase letter')
    .matches(/[a-z]/, 'Requires lowercase letter')
    .matches(/[0-9]/, 'Requires number')
    .matches(/[^A-Za-z0-9]/, 'Requires special character'),
  mfaCode: Yup.string().when('$mfaRequired', {
    is: true,
    then: Yup.string().required('MFA code is required').length(6, 'Must be 6 digits')
  })
});

const LoginPage = () => {
  const { login, mfaChallenge } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [recaptchaToken, setRecaptchaToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (values, { setSubmitting }) => {
    try {
      setLoading(true);
      setError('');
      
      await rateLimit.check(values.email);
      
      const result = await login({
        ...values,
        recaptchaToken,
        mfaCode: mfaRequired ? values.mfaCode : undefined
      });

      if (result.mfaRequired) {
        setMfaRequired(true);
        return;
      }

      navigate('/dashboard');
    } catch (error) {
      setError(error.message);
      await rateLimit.fail(values.email);
    } finally {
      setLoading(false);
      setSubmitting(false);
    }
  };

  const handleSocialLogin = (provider) => {
    window.location.href = `${process.env.REACT_APP_API_URL}/auth/${provider}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Sign in to your account
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <Formik
            initialValues={{ email: '', password: '', mfaCode: '' }}
            validationSchema={LoginSchema}
            onSubmit={handleSubmit}
            validateOnChange={false}
            validateOnBlur={false}
            context={{ mfaRequired }}
          >
            {({ errors, touched, isSubmitting }) => (
              <Form className="space-y-6">
                {/* Email Field */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email address
                  </label>
                  <div className="relative">
                    <Field
                      name="email"
                      type="email"
                      autoComplete="email"
                      className={`input-field ${errors.email && 'input-error'}`}
                      disabled={mfaRequired}
                    />
                    <FaEnvelope className="input-icon" />
                  </div>
                  {errors.email && touched.email && (
                    <p className="text-red-500 text-sm mt-1">{errors.email}</p>
                  )}
                </div>

                {/* Password Field */}
                {!mfaRequired && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Password
                    </label>
                    <div className="relative">
                      <Field
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        className={`input-field ${errors.password && 'input-error'}`}
                      />
                      <FaLock className="input-icon" />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-gray-400 hover:text-gray-500"
                      >
                        {showPassword ? <FaEyeSlash /> : <FaEye />}
                      </button>
                    </div>
                    <PasswordStrength password={values?.password} />
                    {errors.password && touched.password && (
                      <p className="text-red-500 text-sm mt-1">{errors.password}</p>
                    )}
                  </div>
                )}

                {/* MFA Field */}
                {mfaRequired && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      MFA Code
                    </label>
                    <div className="relative">
                      <Field
                        name="mfaCode"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        className={`input-field ${errors.mfaCode && 'input-error'}`}
                        placeholder="Enter 6-digit code"
                      />
                    </div>
                    {errors.mfaCode && touched.mfaCode && (
                      <p className="text-red-500 text-sm mt-1">{errors.mfaCode}</p>
                    )}
                  </div>
                )}

                {/* reCAPTCHA */}
                <ReCAPTCHA
                  sitekey={process.env.REACT_APP_RECAPTCHA_SITE_KEY}
                  onChange={setRecaptchaToken}
                  className="flex justify-center"
                />

                {/* Error Message */}
                {error && (
                  <div className="text-red-500 text-sm text-center">{error}</div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting || !recaptchaToken}
                  className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  {loading ? (
                    <Loader size="sm" className="mx-auto" />
                  ) : mfaRequired ? (
                    'Verify MFA'
                  ) : (
                    'Sign in'
                  )}
                </button>

                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center">
                    <Field
                      type="checkbox"
                      name="rememberMe"
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 block text-sm text-gray-900">
                      Remember me
                    </label>
                  </div>

                  <div className="text-sm">
                    <Link
                      to="/forgot-password"
                      className="font-medium text-indigo-600 hover:text-indigo-500"
                    >
                      Forgot password?
                    </Link>
                  </div>
                </div>

                {/* Social Login */}
                <div className="mt-6">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-white text-gray-500">
                        Or continue with
                      </span>
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => handleSocialLogin('google')}
                      className="social-login-btn bg-red-600 hover:bg-red-700"
                    >
                      <FaGoogle className="social-icon" />
                      Google
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSocialLogin('github')}
                      className="social-login-btn bg-gray-800 hover:bg-gray-900"
                    >
                      <FaGithub className="social-icon" />
                      GitHub
                    </button>
                  </div>
                </div>

                {/* Sign Up Link */}
                <div className="mt-6 text-center text-sm">
                  <span className="text-gray-600">Not a member? </span>
                  <Link
                    to="/register"
                    className="font-medium text-indigo-600 hover:text-indigo-500"
                  >
                    Sign up now
                  </Link>
                </div>
              </Form>
            )}
          </Formik>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;