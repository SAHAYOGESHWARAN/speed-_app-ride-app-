import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import HomePage from './pages/HomePage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ProfilePage from './pages/ProfilePage';
import BookingHistory from './pages/booking/BookingHistory';
import NewBooking from './pages/booking/NewBooking';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/common/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/bookings" element={<BookingHistory />} />
          <Route path="/new-booking" element={<NewBooking />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}

export default App;