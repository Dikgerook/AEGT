import { useState, useEffect } from 'react';

export const useTelegramWebApp = () => {
  const [webApp, setWebApp] = useState(null);
  const [user, setUser] = useState(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const initTelegramWebApp = () => {
      if (window.Telegram && window.Telegram.WebApp) {
        const tg = window.Telegram.WebApp;
        
        // Initialize WebApp
        tg.ready();
        tg.expand();
        
        // Set theme
        if (tg.colorScheme === 'dark') {
          document.documentElement.setAttribute('data-theme', 'dark');
        } else {
          document.documentElement.setAttribute('data-theme', 'light');
        }
        
        // Enable closing confirmation
        tg.enableClosingConfirmation();
        
        setWebApp(tg);
        setUser(tg.initDataUnsafe?.user || null);
        setIsReady(true);
        
        // Listen for theme changes
        tg.onEvent('themeChanged', () => {
          if (tg.colorScheme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
          } else {
            document.documentElement.setAttribute('data-theme', 'light');
          }
        });
        
        // Listen for viewport changes
        tg.onEvent('viewportChanged', () => {
          document.documentElement.style.setProperty(
            '--tg-viewport-height', 
            `${tg.viewportHeight}px`
          );
        });
        
        return tg;
      }
      return null;
    };

    // Try to initialize immediately
    const tg = initTelegramWebApp();
    
    // If not available, wait for it to load
    if (!tg) {
      const checkTelegram = setInterval(() => {
        const tg = initTelegramWebApp();
        if (tg) {
          clearInterval(checkTelegram);
        }
      }, 100);
      
      // Cleanup after 10 seconds
      setTimeout(() => {
        clearInterval(checkTelegram);
        if (!isReady) {
          console.warn('Telegram WebApp not available');
          // For development, create mock user
          if (process.env.NODE_ENV === 'development') {
            setUser({
              id: 123456789,
              first_name: 'Test',
              last_name: 'User',
              username: 'testuser',
              language_code: 'en'
            });
            setIsReady(true);
          }
        }
      }, 10000);
    }
  }, [isReady]);

  const showAlert = (message) => {
    if (webApp) {
      webApp.showAlert(message);
    } else {
      alert(message);
    }
  };

  const showConfirm = (message, callback) => {
    if (webApp) {
      webApp.showConfirm(message, callback);
    } else {
      const result = confirm(message);
      callback(result);
    }
  };

  const showPopup = (params, callback) => {
    if (webApp && webApp.showPopup) {
      webApp.showPopup(params, callback);
    } else {
      const result = confirm(params.message);
      callback(result ? 'ok' : 'cancel');
    }
  };

  const hapticFeedback = (type = 'impact', style = 'medium') => {
    if (webApp && webApp.HapticFeedback) {
      if (type === 'impact') {
        webApp.HapticFeedback.impactOccurred(style);
      } else if (type === 'notification') {
        webApp.HapticFeedback.notificationOccurred(style);
      } else if (type === 'selection') {
        webApp.HapticFeedback.selectionChanged();
      }
    }
  };

  const setHeaderColor = (color) => {
    if (webApp) {
      webApp.setHeaderColor(color);
    }
  };

  const setBackgroundColor = (color) => {
    if (webApp) {
      webApp.setBackgroundColor(color);
    }
  };

  const close = () => {
    if (webApp) {
      webApp.close();
    }
  };

  const sendData = (data) => {
    if (webApp) {
      webApp.sendData(JSON.stringify(data));
    }
  };

  const openLink = (url, options = {}) => {
    if (webApp) {
      webApp.openLink(url, options);
    } else {
      window.open(url, '_blank');
    }
  };

  const openTelegramLink = (url) => {
    if (webApp) {
      webApp.openTelegramLink(url);
    } else {
      window.open(url, '_blank');
    }
  };

  const requestWriteAccess = (callback) => {
    if (webApp && webApp.requestWriteAccess) {
      webApp.requestWriteAccess(callback);
    } else {
      callback(true);
    }
  };

  const requestContact = (callback) => {
    if (webApp && webApp.requestContact) {
      webApp.requestContact(callback);
    } else {
      callback(false);
    }
  };

  return {
    webApp,
    user,
    isReady,
    showAlert,
    showConfirm,
    showPopup,
    hapticFeedback,
    setHeaderColor,
    setBackgroundColor,
    close,
    sendData,
    openLink,
    openTelegramLink,
    requestWriteAccess,
    requestContact,
  };
};