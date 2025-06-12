import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Pickaxe, 
  Zap, 
  Users, 
  BarChart3, 
  Wallet,
  Settings
} from 'lucide-react';
import { useTelegramWebApp } from '../hooks/useTelegramWebApp';
import './Layout.css';

const Layout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { hapticFeedback } = useTelegramWebApp();

  const navigationItems = [
    {
      id: 'mining',
      path: '/mining',
      icon: Pickaxe,
      label: 'Mining',
      color: '#10B981'
    },
    {
      id: 'upgrade',
      path: '/upgrade',
      icon: Zap,
      label: 'Upgrade',
      color: '#F59E0B'
    },
    {
      id: 'frens',
      path: '/frens',
      icon: Users,
      label: 'Frens',
      color: '#8B5CF6'
    },
    {
      id: 'stats',
      path: '/stats',
      icon: BarChart3,
      label: 'Stats',
      color: '#06B6D4'
    },
    {
      id: 'wallet',
      path: '/wallet',
      icon: Wallet,
      label: 'Wallet',
      color: '#1E90FF'
    }
  ];

  const handleNavigation = (path) => {
    hapticFeedback('selection');
    navigate(path);
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <div className="layout">
      {/* Header */}
      <header className="layout-header">
        <div className="header-content">
          <div className="header-logo">
            <div className="logo-icon">
              <Pickaxe size={24} />
            </div>
            <h1 className="logo-text">Aegisum</h1>
          </div>
          <div className="header-actions">
            <button 
              className="header-btn"
              onClick={() => navigate('/settings')}
            >
              <Settings size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="layout-main">
        <div className="main-content">
          <Outlet />
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="layout-nav">
        <div className="nav-content">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            
            return (
              <motion.button
                key={item.id}
                className={`nav-item ${active ? 'nav-item-active' : ''}`}
                onClick={() => handleNavigation(item.path)}
                whileTap={{ scale: 0.95 }}
                style={{
                  '--nav-color': item.color
                }}
              >
                <div className="nav-icon">
                  <Icon 
                    size={20} 
                    strokeWidth={active ? 2.5 : 2}
                  />
                  {active && (
                    <motion.div
                      className="nav-indicator"
                      layoutId="nav-indicator"
                      style={{ backgroundColor: item.color }}
                    />
                  )}
                </div>
                <span className="nav-label">{item.label}</span>
              </motion.button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default Layout;