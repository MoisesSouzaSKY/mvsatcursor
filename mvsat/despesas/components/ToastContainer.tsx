import React from 'react';
import Toast from './Toast';

interface ToastState {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

interface ToastContainerProps {
  toasts: ToastState[];
  onRemoveToast: (id: string) => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts,
  onRemoveToast,
  position = 'top-right'
}) => {
  return (
    <>
      {toasts.map((toast, index) => (
        <div
          key={toast.id}
          style={{
            position: 'fixed',
            zIndex: 9999 + index,
            ...(position.includes('top') ? { top: `${24 + index * 80}px` } : { bottom: `${24 + index * 80}px` }),
            ...(position.includes('right') ? { right: '24px' } : { left: '24px' })
          }}
        >
          <Toast
            message={toast.message}
            type={toast.type}
            isVisible={true}
            onClose={() => onRemoveToast(toast.id)}
            duration={toast.duration}
            position={position}
          />
        </div>
      ))}
    </>
  );
};

export default ToastContainer;