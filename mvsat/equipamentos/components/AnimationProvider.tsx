import React, { useEffect } from 'react';

interface AnimationProviderProps {
  children: React.ReactNode;
}

export const AnimationProvider: React.FC<AnimationProviderProps> = ({ children }) => {
  useEffect(() => {
    // Injetar CSS de animações no documento
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      @keyframes slideInUp {
        from { 
          transform: translateY(20px);
          opacity: 0;
        }
        to { 
          transform: translateY(0);
          opacity: 1;
        }
      }

      @keyframes slideInDown {
        from { 
          transform: translateY(-20px);
          opacity: 0;
        }
        to { 
          transform: translateY(0);
          opacity: 1;
        }
      }

      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }

      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }

      @keyframes bounce {
        0%, 20%, 53%, 80%, 100% {
          transform: translate3d(0, 0, 0);
        }
        40%, 43% {
          transform: translate3d(0, -8px, 0);
        }
        70% {
          transform: translate3d(0, -4px, 0);
        }
        90% {
          transform: translate3d(0, -2px, 0);
        }
      }

      @keyframes shake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-2px); }
        20%, 40%, 60%, 80% { transform: translateX(2px); }
      }

      @keyframes glow {
        0% { box-shadow: 0 0 5px rgba(59, 130, 246, 0.3); }
        50% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.6); }
        100% { box-shadow: 0 0 5px rgba(59, 130, 246, 0.3); }
      }

      /* Classes utilitárias */
      .fade-in { animation: fadeIn 0.3s ease-out; }
      .slide-in-up { animation: slideInUp 0.3s ease-out; }
      .slide-in-down { animation: slideInDown 0.3s ease-out; }
      .spin { animation: spin 1s linear infinite; }
      .pulse { animation: pulse 2s infinite; }
      .bounce { animation: bounce 1s; }
      .shake { animation: shake 0.5s; }
      .glow { animation: glow 2s infinite; }

      /* Efeitos hover */
      .hover-lift {
        transition: all 0.2s ease;
      }
      .hover-lift:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }

      .hover-scale {
        transition: transform 0.2s ease;
      }
      .hover-scale:hover {
        transform: scale(1.05);
      }

      /* Transições suaves */
      .smooth-transition { transition: all 0.2s ease; }
      .smooth-transition-slow { transition: all 0.3s ease; }
      .smooth-transition-fast { transition: all 0.1s ease; }

      /* Estados especiais */
      .success-highlight {
        background-color: #dcfce7 !important;
        animation: fadeIn 0.3s ease-out;
      }

      .error-highlight {
        background-color: #fee2e2 !important;
        animation: shake 0.5s ease-out;
      }

      .loading-spinner {
        display: inline-block;
        width: 20px;
        height: 20px;
        border: 2px solid #f3f4f6;
        border-top: 2px solid #3b82f6;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }

      /* Responsividade para animações */
      @media (prefers-reduced-motion: reduce) {
        *,
        *::before,
        *::after {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }
      }
    `;
    
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return <>{children}</>;
};

// Hook para usar animações programaticamente
export const useAnimations = () => {
  const addAnimation = (element: HTMLElement, animationClass: string, duration = 300) => {
    element.classList.add(animationClass);
    
    setTimeout(() => {
      element.classList.remove(animationClass);
    }, duration);
  };

  const addSuccessHighlight = (element: HTMLElement) => {
    addAnimation(element, 'success-highlight', 2000);
  };

  const addErrorHighlight = (element: HTMLElement) => {
    addAnimation(element, 'error-highlight', 1000);
  };

  const addLoadingSpinner = (element: HTMLElement) => {
    const spinner = document.createElement('div');
    spinner.className = 'loading-spinner';
    element.appendChild(spinner);
    
    return () => {
      if (element.contains(spinner)) {
        element.removeChild(spinner);
      }
    };
  };

  return {
    addAnimation,
    addSuccessHighlight,
    addErrorHighlight,
    addLoadingSpinner
  };
};

export default AnimationProvider;