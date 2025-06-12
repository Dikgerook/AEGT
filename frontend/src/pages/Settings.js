import React from 'react';
import { motion } from 'framer-motion';
import { Settings as SettingsIcon, Moon, Sun, Volume2 } from 'lucide-react';

const Settings = () => {
  return (
    <div className="settings-page">
      <div className="settings-header">
        <h2>Settings</h2>
        <p>Customize your experience</p>
      </div>
      
      <div className="settings-sections">
        <div className="settings-section">
          <h3>Appearance</h3>
          <div className="setting-item">
            <div className="setting-info">
              <Moon size={20} />
              <span>Dark Mode</span>
            </div>
            <div className="setting-toggle">
              <input type="checkbox" defaultChecked />
            </div>
          </div>
        </div>
        
        <div className="settings-section">
          <h3>Notifications</h3>
          <div className="setting-item">
            <div className="setting-info">
              <Volume2 size={20} />
              <span>Sound Effects</span>
            </div>
            <div className="setting-toggle">
              <input type="checkbox" defaultChecked />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;