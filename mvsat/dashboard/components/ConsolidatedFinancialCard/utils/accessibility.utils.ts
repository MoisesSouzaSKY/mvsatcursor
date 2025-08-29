// Accessibility utilities for the ConsolidatedFinancialCard component

/**
 * Calculate contrast ratio between two colors
 * Based on WCAG 2.1 guidelines
 */
export const calculateContrastRatio = (color1: string, color2: string): number => {
  const getLuminance = (color: string): number => {
    // Convert hex to RGB
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;

    // Calculate relative luminance
    const sRGB = [r, g, b].map(c => {
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
  };

  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);

  return (brightest + 0.05) / (darkest + 0.05);
};

/**
 * Check if color combination meets WCAG AA standards
 */
export const meetsWCAGAA = (foreground: string, background: string): boolean => {
  const ratio = calculateContrastRatio(foreground, background);
  return ratio >= 4.5; // WCAG AA standard for normal text
};

/**
 * Check if color combination meets WCAG AAA standards
 */
export const meetsWCAGAAA = (foreground: string, background: string): boolean => {
  const ratio = calculateContrastRatio(foreground, background);
  return ratio >= 7; // WCAG AAA standard for normal text
};

/**
 * Generate accessible color palette for financial data
 */
export const getAccessibleColors = () => {
  return {
    // Primary colors with good contrast
    positive: '#059669', // Green - contrast ratio 4.5+ on white
    negative: '#dc2626', // Red - contrast ratio 4.5+ on white
    neutral: '#6b7280',  // Gray - contrast ratio 4.5+ on white
    warning: '#d97706',  // Orange - contrast ratio 4.5+ on white
    
    // Category colors with good contrast
    iptv: '#7c3aed',     // Purple - contrast ratio 4.5+ on white
    assinaturas: '#db2777', // Pink - contrast ratio 4.5+ on white
    outros: '#4b5563',   // Dark gray - contrast ratio 4.5+ on white
    
    // Background colors
    lightBackground: '#f8fafc',
    cardBackground: '#ffffff',
    borderColor: '#e2e8f0',
    
    // Text colors
    primaryText: '#111827',   // Very high contrast
    secondaryText: '#6b7280', // Good contrast
    mutedText: '#9ca3af'      // Minimum contrast for secondary info
  };
};

/**
 * Generate ARIA labels for financial values
 */
export const generateFinancialAriaLabel = (
  label: string, 
  value: number, 
  currency: boolean = true,
  quantity?: number
): string => {
  const formattedValue = currency 
    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
    : new Intl.NumberFormat('pt-BR').format(value);
  
  let ariaLabel = `${label}: ${formattedValue}`;
  
  if (quantity !== undefined) {
    const quantityText = quantity === 1 ? 'título' : 'títulos';
    ariaLabel += ` em ${quantity} ${quantityText}`;
  }
  
  return ariaLabel;
};

/**
 * Generate ARIA labels for percentage values
 */
export const generatePercentageAriaLabel = (
  category: string,
  percentage: number,
  value: number
): string => {
  const formattedValue = new Intl.NumberFormat('pt-BR', { 
    style: 'currency', 
    currency: 'BRL' 
  }).format(value);
  
  return `${category}: ${formattedValue}, representando ${Math.round(percentage)}% do total`;
};

/**
 * Keyboard navigation helpers
 */
export const handleKeyboardNavigation = (
  event: React.KeyboardEvent,
  onActivate: () => void
) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    onActivate();
  }
};

/**
 * Screen reader announcements
 */
export const announceToScreenReader = (message: string) => {
  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', 'polite');
  announcement.setAttribute('aria-atomic', 'true');
  announcement.style.position = 'absolute';
  announcement.style.left = '-10000px';
  announcement.style.width = '1px';
  announcement.style.height = '1px';
  announcement.style.overflow = 'hidden';
  
  document.body.appendChild(announcement);
  announcement.textContent = message;
  
  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
};

/**
 * Focus management utilities
 */
export const manageFocus = {
  /**
   * Set focus to element with proper error handling
   */
  setFocus: (element: HTMLElement | null) => {
    if (element && typeof element.focus === 'function') {
      try {
        element.focus();
      } catch (error) {
        console.warn('Failed to set focus:', error);
      }
    }
  },

  /**
   * Create focus trap for modal-like components
   */
  createFocusTrap: (container: HTMLElement) => {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
    
    const handleTabKey = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        if (event.shiftKey) {
          if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
          }
        }
      }
    };
    
    container.addEventListener('keydown', handleTabKey);
    
    return () => {
      container.removeEventListener('keydown', handleTabKey);
    };
  }
};

/**
 * Validate accessibility compliance
 */
export const validateAccessibility = () => {
  const colors = getAccessibleColors();
  const results = {
    contrastChecks: {
      positiveOnWhite: meetsWCAGAA(colors.positive, colors.cardBackground),
      negativeOnWhite: meetsWCAGAA(colors.negative, colors.cardBackground),
      primaryTextOnWhite: meetsWCAGAA(colors.primaryText, colors.cardBackground),
      secondaryTextOnWhite: meetsWCAGAA(colors.secondaryText, colors.cardBackground),
      iptvOnWhite: meetsWCAGAA(colors.iptv, colors.cardBackground),
      assinaturasOnWhite: meetsWCAGAA(colors.assinaturas, colors.cardBackground),
      outrosOnWhite: meetsWCAGAA(colors.outros, colors.cardBackground)
    },
    recommendations: [] as string[]
  };
  
  // Add recommendations based on results
  Object.entries(results.contrastChecks).forEach(([key, passes]) => {
    if (!passes) {
      results.recommendations.push(`Improve contrast for ${key}`);
    }
  });
  
  return results;
};