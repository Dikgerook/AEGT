import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useTonConnectUI } from '@tonconnect/ui-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';

// Components
import Layout from './components/Layout';
import LoadingScreen from './components/LoadingScreen';
import MiningDashboard from './pages/MiningDashboard';
import UpgradeShop from './pages/UpgradeShop';
import Wallet from './pages/Wallet';
import Settings from './pages/Settings';

// Hooks
import { useTelegramWebApp } from './hooks/useTelegramWebApp';
import { useAuth } from './hooks/useAuth';

// Services
import { initializeUser } from './services/api';

// Styles
import './styles/App.css';

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [tonConnectUI] = useTonConnectUI();
  const { webApp, user: tgUser } = useTelegramWebApp();
  const { user, login, isAuthenticated } = useAuth();

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Wait for Telegram WebApp to be ready
        if (!webApp || !tgUser) {
          setTimeout(initializeApp, 100);
          return;
        }

        // Initialize user in backend
        const userData = await initializeUser({
          telegramId: tgUser.id,
          username: tgUser.username,
          firstName: tgUser.first_name,
          lastName: tgUser.last_name,
          languageCode: tgUser.language_code,
        });

        // Login user
        await login(userData);

        setIsInitialized(true);
        toast.success('Welcome to Aegisum!');
      } catch (error) {
        console.error('Failed to initialize app:', error);
        toast.error('Failed to initialize app. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    initializeApp();
  }, [webApp, tgUser, login]);

  // Show loading screen while initializing
  if (isLoading || !isInitialized) {
    return <LoadingScreen />;
  }

  // Redirect to mining dashboard if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="error-container">
        <h2>Authentication Required</h2>
        <p>Please open this app through Telegram.</p>
      </div>
    );
  }

  return (
    <Router basename="/webapp">
      <div className="app">
        <AnimatePresence mode="wait">
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Navigate to="/mining" replace />} />
              <Route 
                path="/mining" 
                element={
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <MiningDashboard />
                  </motion.div>
                } 
              />
              <Route 
                path="/upgrade" 
                element={
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <UpgradeShop />
                  </motion.div>
                } 
              />
              <Route 
                path="/wallet" 
                element={
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Wallet />
                  </motion.div>
                } 
              />
              <Route 
                path="/settings" 
                element={
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Settings />
                  </motion.div>
                } 
              />
            </Route>
          </Routes>
        </AnimatePresence>
      </div>
    </Router>
  );
}

export default App;