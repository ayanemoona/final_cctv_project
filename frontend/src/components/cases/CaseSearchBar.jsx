// src/components/cases/CaseSearchBar.jsx
import React from 'react';
import { Search, RefreshCw } from 'lucide-react';

export const CaseSearchBar = ({ searchQuery, onSearchChange, onRefresh }) => {
  return (
    <div className="search-container">
      <div className="search-input-wrapper">
        <Search className="search-icon" size={20} />
        <input
          type="text"
          placeholder="사건번호, 제목, 위치로 검색..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="search-input"
        />
      </div>
      <button onClick={onRefresh} className="refresh-btn">
        <RefreshCw size={16} />
        <span>새로고침</span>
      </button>
    </div>
  );
};