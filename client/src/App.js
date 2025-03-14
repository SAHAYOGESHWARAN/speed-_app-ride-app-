import { lazy, Suspense } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AuthProvider } from './context/AuthContext';
import { ErrorProvider } from './context/ErrorContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import RoleRestrictedRoute from './components/common/RoleRestrictedRoute';
import ErrorBoundary from './components/common/ErrorBoundary';
import LoadingSpinner from './components/common/LoadingSpinner';
import MainLayout from './layouts/MainLayout';
import AuthLayout from './layouts/AuthLayout';
import NotFoundPage from './pages/errors/NotFoundPage';
import ServerErrorPage from './pages/errors/ServerErrorPage';

// Lazy-loaded page components
const HomePage = lazy(() => import('./pages/HomePage'));
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const BookingHistory = lazy(() => import('./pages/booking/BookingHistory'));
const NewBooking = lazy(() => import('./pages/booking/NewBooking'));
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));

const pageVariants = {
  initial: { opacity: 0, x: -50 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 50 }
};

const AnimatedRoute = ({ children }) => (
  <motion.div
    initial="initial"
    animate="animate"
    exit="exit"
    variants={pageVariants}
    transition={{ duration: 0.2 }}
  >
    {children}
  </motion.div>
);

function App() {
  const location = useLocation();

  return (
    <ErrorProvider>
      <AuthProvider>
        <MainLayout>
          <ErrorBoundary fallback={<ServerErrorPage />}>
            <AnimatePresence mode="wait">
              <Suspense fallback={<LoadingSpinner fullPage />}>
                <Routes location={location} key={location.key}>
                  {/* Public Routes */}
                  <Route element={<AuthLayout />}>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                  </Route>

                  <Route path="/" element={<HomePage />} />

                  {/* Authenticated Routes */}
                  <Route
                    element={
                      <ProtectedRoute>
                        <AnimatedRoute />
                      </ProtectedRoute>
                    }
                  >
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/bookings" element={<BookingHistory />} />
                    <Route path="/new-booking" element={<NewBooking />} />
                  </Route>

                  {/* Admin Routes */}
                  <Route
                    element={
                      <RoleRestrictedRoute roles={['admin']}>
                        <AnimatedRoute />
                      </RoleRestrictedRoute>
                    }
                  >
                    <Route path="/admin" element={<AdminDashboard />} />
                  </Route>

                  {/* Error Handling */}
                  <Route path="/500" element={<ServerErrorPage />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </Suspense>
            </AnimatePresence>
          </ErrorBoundary>
        </MainLayout>
      </AuthProvider>
    </ErrorProvider>
  );
}

export default App;