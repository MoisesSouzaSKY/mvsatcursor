import React from 'react';

interface SkeletonLoaderProps {
  type: 'card' | 'table' | 'text' | 'button';
  count?: number;
  height?: string;
  width?: string;
}

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  type,
  count = 1,
  height,
  width
}) => {
  const SkeletonCard = () => (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '16px',
      padding: '32px',
      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      border: '1px solid #f1f5f9',
      animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
    }}>
      {/* Icon skeleton */}
      <div style={{
        width: '64px',
        height: '64px',
        backgroundColor: '#f3f4f6',
        borderRadius: '16px',
        marginBottom: '24px'
      }} />
      
      {/* Title skeleton */}
      <div style={{
        height: '16px',
        backgroundColor: '#f3f4f6',
        borderRadius: '4px',
        marginBottom: '12px',
        width: '60%'
      }} />
      
      {/* Value skeleton */}
      <div style={{
        height: '32px',
        backgroundColor: '#f3f4f6',
        borderRadius: '4px',
        marginBottom: '8px',
        width: '80%'
      }} />
      
      {/* Subtitle skeleton */}
      <div style={{
        height: '14px',
        backgroundColor: '#f3f4f6',
        borderRadius: '4px',
        width: '50%'
      }} />
    </div>
  );

  const SkeletonTable = () => (
    <div style={{
      border: '1px solid #e5e7eb',
      borderRadius: '12px',
      backgroundColor: 'white',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      overflow: 'hidden',
      animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: '#f8fafc',
        padding: '16px 20px',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        gap: '20px'
      }}>
        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
          <div key={i} style={{
            height: '16px',
            backgroundColor: '#e2e8f0',
            borderRadius: '4px',
            flex: 1
          }} />
        ))}
      </div>
      
      {/* Rows */}
      {Array.from({ length: 5 }).map((_, rowIndex) => (
        <div key={rowIndex} style={{
          padding: '16px 20px',
          borderBottom: rowIndex < 4 ? '1px solid #f1f5f9' : 'none',
          display: 'flex',
          gap: '20px',
          alignItems: 'center'
        }}>
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} style={{
              height: i === 8 ? '32px' : '16px',
              backgroundColor: '#f3f4f6',
              borderRadius: i === 8 ? '8px' : '4px',
              flex: 1,
              width: i === 8 ? '80px' : 'auto'
            }} />
          ))}
        </div>
      ))}
    </div>
  );

  const SkeletonText = () => (
    <div style={{
      height: height || '16px',
      width: width || '100%',
      backgroundColor: '#f3f4f6',
      borderRadius: '4px',
      animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
    }} />
  );

  const SkeletonButton = () => (
    <div style={{
      height: height || '40px',
      width: width || '120px',
      backgroundColor: '#f3f4f6',
      borderRadius: '8px',
      animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
    }} />
  );

  const renderSkeleton = () => {
    switch (type) {
      case 'card':
        return <SkeletonCard />;
      case 'table':
        return <SkeletonTable />;
      case 'text':
        return <SkeletonText />;
      case 'button':
        return <SkeletonButton />;
      default:
        return <SkeletonText />;
    }
  };

  return (
    <>
      <style>
        {`
          @keyframes pulse {
            0%, 100% {
              opacity: 1;
            }
            50% {
              opacity: .5;
            }
          }
        `}
      </style>
      
      {type === 'card' ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '24px'
        }}>
          {Array.from({ length: count }).map((_, index) => (
            <div key={index}>
              {renderSkeleton()}
            </div>
          ))}
        </div>
      ) : (
        <>
          {Array.from({ length: count }).map((_, index) => (
            <div key={index} style={{ marginBottom: type === 'text' ? '8px' : '0' }}>
              {renderSkeleton()}
            </div>
          ))}
        </>
      )}
    </>
  );
};

export default SkeletonLoader;