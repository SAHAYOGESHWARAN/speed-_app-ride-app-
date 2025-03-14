import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiMenu, FiX, FiUser, FiLogOut } from 'react-icons/fi';
import { toast } from 'react-toastify';
import Logo from './Logo';
import Avatar from './Avatar';
import LoadingSpinner from './LoadingSpinner';

const Navbar = () => {
  const { user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = async () => {
    if (!window.confirm('Are you sure you want to logout?')) return;
    
    setIsLoggingOut(true);
    try {
      await logout();
      toast.success('Logged out successfully');
      navigate('/login');
    } catch (error) {
      toast.error('Logout failed. Please try again.');
    } finally {
      setIsLoggingOut(false);
      setIsMenuOpen(false);
    }
  };

  return (
    <nav className={`fixed w-full z-50 transition-all ${isScrolled ? 'bg-white shadow-md' : 'bg-transparent'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex-shrink-0">
            <Logo className="h-8 w-auto" />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/about" className="nav-link">About</Link>
            <Link to="/services" className="nav-link">Services</Link>
            
            {user ? (
              <>
                <Link to="/bookings" className="nav-link">Bookings</Link>
                <div className="relative group">
                  <button className="flex items-center space-x-2">
                    <Avatar src={user.avatar} name={user.name} />
                    <span className="text-gray-700">{user.name}</span>
                  </button>
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 hidden group-hover:block">
                    <Link to="/profile" className="dropdown-link">
                      <FiUser className="mr-2" /> Profile
                    </Link>
                    <button 
                      onClick={handleLogout}
                      className="dropdown-link w-full text-left"
                      disabled={isLoggingOut}
                    >
                      {isLoggingOut ? (
                        <LoadingSpinner size="sm" />
                      ) : (
                        <>
                          <FiLogOut className="mr-2" /> Logout
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex space-x-4">
                <Link to="/login" className="btn-secondary">Login</Link>
                <Link to="/register" className="btn-primary">Get Started</Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 rounded-md focus:outline-none"
            aria-label="Toggle navigation"
          >
            {isMenuOpen ? (
              <FiX className="h-6 w-6" />
            ) : (
              <FiMenu className="h-6 w-6" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden absolute top-16 inset-x-0 bg-white shadow-lg">
            <div className="px-4 pt-2 pb-4 space-y-1">
              <Link to="/about" className="mobile-nav-link">About</Link>
              <Link to="/services" className="mobile-nav-link">Services</Link>
              
              {user ? (
                <>
                  <Link to="/bookings" className="mobile-nav-link">Bookings</Link>
                  <Link to="/profile" className="mobile-nav-link">
                    <FiUser className="mr-2 inline" /> Profile
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="mobile-nav-link w-full text-left"
                    disabled={isLoggingOut}
                  >
                    {isLoggingOut ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <>
                        <FiLogOut className="mr-2 inline" /> Logout
                      </>
                    )}
                  </button>
                </>
              ) : (
                <div className="pt-4 space-y-2">
                  <Link to="/login" className="btn-secondary block w-full">Login</Link>
                  <Link to="/register" className="btn-primary block w-full">Get Started</Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

// Styled components
const navLinkBase = "text-sm font-medium transition-colors px-3 py-2 rounded-md";
const NavLink = ({ children, ...props }) => (
  <Link {...props} className={`${navLinkBase} text-gray-700 hover:bg-gray-100`}>
    {children}
  </Link>
);

const MobileNavLink = ({ children, ...props }) => (
  <Link {...props} className={`block px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md`}>
    {children}
  </Link>
);

const DropdownLink = ({ children, ...props }) => (
  <button {...props} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left">
    {children}
  </button>
);

export default Navbar;