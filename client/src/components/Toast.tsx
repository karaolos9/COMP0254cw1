import React, { useEffect } from 'react';
import '../styles/Toast.css';

interface ToastProps {
  message: string;
  isVisible: boolean;
  onHide: () => void;
  type?: 'success' | 'error';
}

export function Toast({ message, isVisible, onHide, type = 'success' }: ToastProps) {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onHide();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onHide]);

  return (
    <div className={`toast ${isVisible ? 'show' : ''} ${type}`}>
      {message}
    </div>
  );
} 