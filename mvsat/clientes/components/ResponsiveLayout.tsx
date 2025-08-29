import React from 'react';

interface ResponsiveLayoutProps {
  children: React.ReactNode;
}

const ResponsiveLayout: React.FC<ResponsiveLayoutProps> = ({ children }) => {
  return (
    <>
      <style>
        {`
          /* Breakpoints idênticos aos usados em Equipamentos/Assinaturas */
          @media (max-width: 768px) {
            .responsive-grid {
              grid-template-columns: 1fr !important;
              gap: 16px !important;
            }
            .responsive-flex {
              flex-direction: column !important;
              gap: 12px !important;
            }
            .responsive-padding {
              padding: 16px !important;
            }
            .responsive-text-sm {
              font-size: 14px !important;
            }
            .responsive-hide-mobile {
              display: none !important;
            }
            .responsive-table {
              overflow-x: auto !important;
              -webkit-overflow-scrolling: touch;
            }
            .responsive-table table {
              min-width: 800px !important;
            }
            .responsive-banner {
              padding: 24px 20px !important;
              text-align: left !important;
            }
            .responsive-header {
              flex-direction: column !important;
              align-items: flex-start !important;
              gap: 16px !important;
            }
            .responsive-filters {
              grid-template-columns: 1fr !important;
            }
            .responsive-card-grid {
              grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)) !important;
              gap: 16px !important;
            }
          }
          @media (max-width: 480px) {
            .responsive-card-grid { grid-template-columns: 1fr !important; }
            .responsive-padding { padding: 12px !important; }
            .responsive-banner { padding: 20px 16px !important; }
          }
          @media (min-width: 769px) and (max-width: 1024px) {
            .responsive-card-grid { grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)) !important; }
            .responsive-filters { grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)) !important; }
          }
          @media (min-width: 1025px) {
            .responsive-card-grid { grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)) !important; }
            .responsive-filters { grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)) !important; }
          }
        `}
      </style>

      <div
        style={{
          padding: '20px',
          width: '100%',
          maxWidth: 'none',
          minHeight: '100vh',
          backgroundColor: '#f8fafc',
          boxSizing: 'border-box'
        }}
        className="responsive-padding"
      >
        {children}
      </div>
    </>
  );
};

export default ResponsiveLayout;