// src/components/common/ErrorMessage.jsx
import React from 'react';
import { AlertCircle } from 'lucide-react';

export const ErrorMessage = ({ message, onRetry }) => {
  if (!message) return null;

  return (
    <div className="flex items-center justify-center p-6">
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-md w-full">
        <div className="flex items-center">
          <AlertCircle className="h-5 w-5 text-red-400 mr-3" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-red-800">오류가 발생했습니다</h3>
            <p className="text-sm text-red-700 mt-1">{message}</p>
          </div>
        </div>
        {onRetry && (
          <div className="mt-3">
            <button
              onClick={onRetry}
              className="text-sm bg-red-100 text-red-800 px-3 py-1 rounded hover:bg-red-200"
            >
              다시 시도
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
