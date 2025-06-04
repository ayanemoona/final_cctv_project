// src/components/common/Header.jsx
import React from 'react';
import { LogOut } from 'lucide-react';

export const Header = ({ title, user, onLogout, actions = [] }) => {
  return (
    <div className="header">
      <div className="header-container">
        <div className="header-content">
          <div className="header-title-section">
            <h1 className="header-title">{title}</h1>
            {user && (
              <p className="header-subtitle">
                {user.rank} {user.last_name}{user.first_name} - {user.department}
              </p>
            )}
          </div>
          <div className="header-actions">
            {actions.map((action, index) => (
              <button
                key={index}
                onClick={action.onClick}
                className={action.className || 'btn btn-primary'}
              >
                {action.icon}
                <span>{action.label}</span>
              </button>
            ))}
            {onLogout && (
              <button
                onClick={onLogout}
                className="btn btn-logout"
              >
                <LogOut size={16} />
                <span>로그아웃</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};