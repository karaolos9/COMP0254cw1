import { useEffect } from 'react';
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
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onHide]);

  return (
    <div className={`toast ${isVisible ? 'show' : ''} ${type}`}>
      <div className="toast-content">
        <i className={`fas ${type === 'success' ? 'fa-check-circle' : 'fa-times-circle'}`}></i>
        <span>{message}</span>
      </div>
    </div>
  );
} 