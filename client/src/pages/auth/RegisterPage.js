import { useState } from 'react';
import { Formik, Field, Form } from 'formik';
import * as Yup from 'yup';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { FaGoogle, FaGithub, FaLock, FaEnvelope, FaUser, FaEye, FaEyeSlash } from 'react-icons/fa';
import ReCAPTCHA from 'react-google-recaptcha';
import Loader from '../components/Loader';
import PasswordStrength from '../components/PasswordStrength';
import TermsModal from '../components/TermsModal';

const RegisterSchema = Yup.object().shape({
  name: Yup.string()
    .required('Required')
    .min(2, 'Minimum 2 characters')
    .max(50, 'Maximum 50 characters'),
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
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('password'), null], 'Passwords must match')
    .required('Required'),
  acceptTerms: Yup.boolean()
    .oneOf([true], 'You must accept the terms & conditions')
});

const RegisterPage = () => {
  const { register } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [recaptchaToken, setRecaptchaToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (values) => {
    try {
      setLoading(true);
      setError('');
      
      if (!recaptchaToken) {
        throw new Error('Please complete the reCAPTCHA');
      }

      await register({
        ...values,
        recaptchaToken
      });

      navigate('/verify-email');
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = (provider) => {
    window.location.href = `${process.env.REACT_APP_API_URL}/auth/${provider}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Create a new account
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <Formik
            initialValues={{ 
              name: '', 
              email: '', 
              password: '', 
              confirmPassword: '',
              acceptTerms: false 
            }}
            validationSchema={RegisterSchema}
            onSubmit={handleSubmit}
          >
            {({ errors, touched, values }) => (
              <Form className="space-y-6">
                {/* Name Field */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <Field
                      name="name"
                      type="text"
                      autoComplete="name"
                      className={`input-field ${errors.name && 'input-error'}`}
                    />
                    <FaUser className="input-icon" />
                  </div>
                  {errors.name && touched.name && (
                    <p className="text-red-500 text-sm mt-1">{errors.name}</p>
                  )}
                </div>

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
                    />
                    <FaEnvelope className="input-icon" />
                  </div>
                  {errors.email && touched.email && (
                    <p className="text-red-500 text-sm mt-1">{errors.email}</p>
                  )}
                </div>

                {/* Password Field */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Field
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
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
                  <PasswordStrength password={values.password} />
                  {errors.password && touched.password && (
                    <p className="text-red-500 text-sm mt-1">{errors.password}</p>
                  )}
                </div>

                {/* Confirm Password Field */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Field
                      name="confirmPassword"
                      type="password"
                      autoComplete="new-password"
                      className={`input-field ${errors.confirmPassword && 'input-error'}`}
                    />
                    <FaLock className="input-icon" />
                  </div>
                  {errors.confirmPassword && touched.confirmPassword && (
                    <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>
                  )}
                </div>

                {/* Terms Checkbox */}
                <div className="flex items-center">
                  <Field
                    type="checkbox"
                    name="acceptTerms"
                    id="acceptTerms"
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor="acceptTerms" className="ml-2 block text-sm text-gray-900">
                    I agree to the{' '}
                    <button
                      type="button"
                      onClick={() => setShowTerms(true)}
                      className="text-indigo-600 hover:text-indigo-500"
                    >
                      Terms & Conditions
                    </button>
                  </label>
                </div>
                {errors.acceptTerms && (
                  <p className="text-red-500 text-sm mt-1">{errors.acceptTerms}</p>
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
                  disabled={loading || !recaptchaToken}
                  className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  {loading ? (
                    <Loader size="sm" className="mx-auto" />
                  ) : (
                    'Create Account'
                  )}
                </button>

                {/* Social Login */}
                <div className="mt-6">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-white text-gray-500">
                        Or sign up with
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

                {/* Login Link */}
                <div className="mt-6 text-center text-sm">
                  <span className="text-gray-600">Already have an account? </span>
                  <Link
                    to="/login"
                    className="font-medium text-indigo-600 hover:text-indigo-500"
                  >
                    Sign in
                  </Link>
                </div>
              </Form>
            )}
          </Formik>
        </div>
      </div>

      <TermsModal 
        isOpen={showTerms} 
        onClose={() => setShowTerms(false)}
      />
    </div>
  );
};

export default RegisterPage;