import { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../services/authService';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (token) {
          const userData = await authService.getMe(token);
          setUser(userData);
        }
      } catch (error) {
        logout();
      }
    };
    checkAuth();
  }, [token]);

  const login = async (credentials) => {
    try {
      const { user, token } = await authService.login(credentials);
      localStorage.setItem('token', token);
      setToken(token);
      setUser(user);
      navigate('/profile');
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);