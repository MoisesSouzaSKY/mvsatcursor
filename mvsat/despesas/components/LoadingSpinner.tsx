import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  text?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  color = '#3b82f6',
  text
}) => {
  const getSizeConfig = (size: string) => {
    switch (size) {
      case 'sm':
        return { width: '16px', height: '16px', borderWidth: '2px' };
      case 'lg':
        return { width: '32px', height: '32px', borderWidth: '3px' };
      case 'md':
      default:
        return { width: '24px', height: '24px', borderWidth: '2px' };
    }
  };

  const sizeConfig = getSizeConfig(size);

  return (
    <>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
      
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: text ? '8px' : '0'
      }}>
        <div style={{
          display: 'inline-block',
          width: sizeConfig.width,
          height: sizeConfig.height,
          border: `${sizeConfig.borderWidth} solid #f3f3f3`,
          borderTop: `${sizeConfig.borderWidth} solid ${color}`,
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        
        {text && (
          <span style={{
            fontSize: size === 'sm' ? '14px' : size === 'lg' ? '18px' : '16px',
            color: '#6b7280',
            fontWeight: '500'
          }}>
            {text}
          </span>
        )}
      </div>
    </>
  );
};

export default LoadingSpinner;