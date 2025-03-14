import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Formik, Field, Form } from 'formik';
import * as Yup from 'yup';
import { FaUser, FaEnvelope, FaPhone, FaLock, FaGoogle, FaFacebook, FaTrash } from 'react-icons/fa';
import { motion } from 'framer-motion';
import AvatarEditor from 'react-avatar-editor';
import api from '../utils/api';
import Loader from '../components/Loader';
import PaymentMethodCard from '../components/PaymentMethodCard';

const ProfileSchema = Yup.object().shape({
  name: Yup.string().required('Required'),
  email: Yup.string().email('Invalid email').required('Required'),
  phone: Yup.string().matches(/^[0-9]{10}$/, 'Invalid phone number')
});

const SecuritySchema = Yup.object().shape({
  currentPassword: Yup.string().required('Required'),
  newPassword: Yup.string()
    .required('Required')
    .min(12, 'Minimum 12 characters')
    .matches(/[A-Z]/, 'Requires uppercase letter')
    .matches(/[a-z]/, 'Requires lowercase letter')
    .matches(/[0-9]/, 'Requires number')
    .matches(/[^A-Za-z0-9]/, 'Requires special character'),
});

const ProfilePage = () => {
  const { user, updateProfile, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [avatar, setAvatar] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sessionsRes, paymentsRes, bookingsRes] = await Promise.all([
          api.get('/sessions'),
          api.get('/payment-methods'),
          api.get('/bookings?limit=5')
        ]);
        
        setSessions(sessionsRes.data);
        setPaymentMethods(paymentsRes.data);
        setBookings(bookingsRes.data);
      } catch (err) {
        setError('Failed to load profile data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleProfileUpdate = async (values) => {
    try {
      await updateProfile(values);
      // Add success feedback
    } catch (error) {
      setError('Profile update failed');
    }
  };

  const handlePasswordChange = async (values) => {
    try {
      await api.put('/auth/password', values);
      // Add success feedback and logout
      logout();
    } catch (error) {
      setError('Password change failed');
    }
  };

  const handleAvatarUpload = async () => {
    if (avatar) {
      const formData = new FormData();
      formData.append('avatar', avatar);
      
      try {
        await api.put('/profile/avatar', formData);
        // Update user context and show success
      } catch (error) {
        setError('Avatar upload failed');
      }
    }
  };

  const revokeSession = async (sessionId) => {
    try {
      await api.delete(`/sessions/${sessionId}`);
      setSessions(sessions.filter(s => s.id !== sessionId));
    } catch (error) {
      setError('Failed to revoke session');
    }
  };

  if (loading) return <Loader />;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar Navigation */}
          <div className="w-full md:w-64 space-y-2">
            <button onClick={() => setActiveTab('profile')} className={`nav-tab ${activeTab === 'profile' ? 'active' : ''}`}>
              <FaUser className="mr-2" /> Profile
            </button>
            <button onClick={() => setActiveTab('security')} className={`nav-tab ${activeTab === 'security' ? 'active' : ''}`}>
              <FaLock className="mr-2" /> Security
            </button>
            <button onClick={() => setActiveTab('payments')} className={`nav-tab ${activeTab === 'payments' ? 'active' : ''}`}>
              <FaGoogle className="mr-2" /> Payments
            </button>
            <button onClick={() => setActiveTab('bookings')} className={`nav-tab ${activeTab === 'bookings' ? 'active' : ''}`}>
              <FaUser className="mr-2" /> Bookings
            </button>
          </div>

          {/* Main Content */}
          <div className="flex-1 bg-white rounded-lg shadow p-6">
            {error && <div className="text-red-500 mb-4">{error}</div>}

            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="flex items-center mb-8">
                  <div className="relative group">
                    <AvatarEditor
                      image={user.avatar || '/default-avatar.jpg'}
                      width={128}
                      height={128}
                      borderRadius={128}
                      className="rounded-full"
                    />
                    <input
                      type="file"
                      onChange={(e) => setAvatar(e.target.files[0])}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      accept="image/*"
                    />
                  </div>
                  <div className="ml-6">
                    <h1 className="text-2xl font-bold">{user.name}</h1>
                    <p className="text-gray-600">{user.email}</p>
                  </div>
                </div>

                <Formik
                  initialValues={user}
                  validationSchema={ProfileSchema}
                  onSubmit={handleProfileUpdate}
                >
                  {({ errors, touched }) => (
                    <Form className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Name</label>
                        <div className="relative">
                          <Field name="name" className="input-field" />
                          <FaUser className="input-icon" />
                        </div>
                        {errors.name && touched.name && (
                          <div className="text-red-500 text-sm">{errors.name}</div>
                        )}
                      </div>

                      {/* Email and Phone fields similar */}

                      <button type="submit" className="btn-primary">
                        Update Profile
                      </button>
                    </Form>
                  )}
                </Formik>

                <div className="mt-8">
                  <h3 className="text-lg font-semibold mb-4">Connected Accounts</h3>
                  <div className="space-y-2">
                    <button className="social-connection">
                      <FaGoogle className="mr-2" /> Connect Google
                    </button>
                    <button className="social-connection">
                      <FaFacebook className="mr-2" /> Connect Facebook
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Formik
                  initialValues={{ currentPassword: '', newPassword: '' }}
                  validationSchema={SecuritySchema}
                  onSubmit={handlePasswordChange}
                >
                  {/* Password change form similar to profile */}
                </Formik>

                <div className="mt-8">
                  <h3 className="text-lg font-semibold mb-4">Active Sessions</h3>
                  <div className="space-y-4">
                    {sessions.map(session => (
                      <div key={session.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium">{session.device}</p>
                            <p className="text-sm text-gray-500">
                              {session.location} • Last active: {session.lastActive}
                            </p>
                          </div>
                          {!session.current && (
                            <button 
                              onClick={() => revokeSession(session.id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <FaTrash />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Payments Tab */}
            {activeTab === 'payments' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold">Payment Methods</h2>
                <div className="grid gap-4 md:grid-cols-2">
                  {paymentMethods.map(method => (
                    <PaymentMethodCard 
                      key={method.id}
                      method={method}
                      onDelete={() => handleDeletePayment(method.id)}
                    />
                  ))}
                </div>
                <button className="btn-secondary">
                  Add New Payment Method
                </button>
              </div>
            )}

            {/* Bookings Tab */}
            {activeTab === 'bookings' && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold">Recent Bookings</h2>
                {bookings.map(booking => (
                  <div key={booking.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">{booking.date}</p>
                        <p className="text-gray-600">
                          {booking.pickup} → {booking.dropoff}
                        </p>
                      </div>
                      <span className={`badge-${booking.status}`}>
                        {booking.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;