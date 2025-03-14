import API from './api';

export default {
  login: async (credentials) => {
    const { data } = await API.post('/auth/login', credentials);
    return data;
  },
  register: async (userData) => {
    const { data } = await API.post('/auth/signup', userData);
    return data;
  },
  getMe: async (token) => {
    const { data } = await API.get('/users/me');
    return data;
  },
};