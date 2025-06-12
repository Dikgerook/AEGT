import axios from 'axios';
import { toast } from 'react-hot-toast';

// Create axios instance
export const api = axios.create({
  baseURL: process.env.NODE_ENV === 'production' 
    ? 'https://aegisum.co.za/api' 
    : 'http://localhost:3001/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      delete api.defaults.headers.common['Authorization'];
      toast.error('Session expired. Please login again.');
      window.location.reload();
    } else if (error.response?.status >= 500) {
      toast.error('Server error. Please try again later.');
    } else if (error.code === 'NETWORK_ERROR') {
      toast.error('Network error. Please check your connection.');
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (userData) => api.post('/auth/login', userData),
  me: () => api.get('/auth/me'),
  refresh: () => api.post('/auth/refresh'),
};

// User API
export const userAPI = {
  getProfile: () => api.get('/user/profile'),
  updateProfile: (data) => api.put('/user/profile', data),
  getStats: () => api.get('/user/stats'),
  getBalance: () => api.get('/user/balance'),
  getTransactions: (params) => api.get('/user/transactions', { params }),
};

// Mining API
export const miningAPI = {
  startMining: () => api.post('/mining/start'),
  stopMining: () => api.post('/mining/stop'),
  getStatus: () => api.get('/mining/status'),
  claimReward: (blockId) => api.post(`/mining/claim/${blockId}`),
  getHistory: (params) => api.get('/mining/history', { params }),
  getBlocks: (params) => api.get('/mining/blocks', { params }),
};

// Upgrade API
export const upgradeAPI = {
  getUpgrades: () => api.get('/upgrades'),
  purchaseUpgrade: (upgradeId, paymentData) => api.post(`/upgrades/${upgradeId}/purchase`, paymentData),
  getUpgradeHistory: () => api.get('/upgrades/history'),
};

// Energy API
export const energyAPI = {
  getStatus: () => api.get('/energy/status'),
  refill: (paymentData) => api.post('/energy/refill', paymentData),
  getRefillHistory: () => api.get('/energy/history'),
};

// TON API
export const tonAPI = {
  connectWallet: (walletData) => api.post('/ton/connect', walletData),
  disconnectWallet: () => api.post('/ton/disconnect'),
  getBalance: () => api.get('/ton/balance'),
  sendTransaction: (transactionData) => api.post('/ton/transaction', transactionData),
  getTransactions: (params) => api.get('/ton/transactions', { params }),
};

// Admin API
export const adminAPI = {
  getUsers: (params) => api.get('/admin/users', { params }),
  getStats: () => api.get('/admin/stats'),
  updateTreasuryFee: (fee) => api.put('/admin/treasury-fee', { fee }),
  getSystemStatus: () => api.get('/admin/system-status'),
};

// Helper functions
export const initializeUser = async (telegramData) => {
  try {
    const response = await api.post('/auth/initialize', telegramData);
    return response.data;
  } catch (error) {
    console.error('Failed to initialize user:', error);
    throw error;
  }
};

export const formatError = (error) => {
  if (error.response?.data?.message) {
    return error.response.data.message;
  } else if (error.message) {
    return error.message;
  } else {
    return 'An unexpected error occurred';
  }
};

export default api;