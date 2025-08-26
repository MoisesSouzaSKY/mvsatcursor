export const animations = {
  transitions: {
    fast: '150ms ease-in-out',
    normal: '250ms ease-in-out',
    slow: '350ms ease-in-out'
  },
  
  keyframes: {
    fadeIn: {
      from: { opacity: 0 },
      to: { opacity: 1 }
    },
    
    fadeOut: {
      from: { opacity: 1 },
      to: { opacity: 0 }
    },
    
    slideInRight: {
      from: { transform: 'translateX(100%)', opacity: 0 },
      to: { transform: 'translateX(0)', opacity: 1 }
    },
    
    slideInLeft: {
      from: { transform: 'translateX(-100%)', opacity: 0 },
      to: { transform: 'translateX(0)', opacity: 1 }
    },
    
    slideInUp: {
      from: { transform: 'translateY(100%)', opacity: 0 },
      to: { transform: 'translateY(0)', opacity: 1 }
    },
    
    slideInDown: {
      from: { transform: 'translateY(-100%)', opacity: 0 },
      to: { transform: 'translateY(0)', opacity: 1 }
    },
    
    scaleIn: {
      from: { transform: 'scale(0.95)', opacity: 0 },
      to: { transform: 'scale(1)', opacity: 1 }
    },
    
    scaleOut: {
      from: { transform: 'scale(1)', opacity: 1 },
      to: { transform: 'scale(0.95)', opacity: 0 }
    },
    
    bounce: {
      '0%, 20%, 53%, 80%, 100%': { transform: 'translate3d(0,0,0)' },
      '40%, 43%': { transform: 'translate3d(0, -30px, 0)' },
      '70%': { transform: 'translate3d(0, -15px, 0)' },
      '90%': { transform: 'translate3d(0, -4px, 0)' }
    },
    
    pulse: {
      '0%': { transform: 'scale(1)' },
      '50%': { transform: 'scale(1.05)' },
      '100%': { transform: 'scale(1)' }
    },
    
    spin: {
      from: { transform: 'rotate(0deg)' },
      to: { transform: 'rotate(360deg)' }
    },
    
    ping: {
      '75%, 100%': {
        transform: 'scale(2)',
        opacity: 0
      }
    }
  },
  
  // Durações padrão
  durations: {
    fast: 150,
    normal: 250,
    slow: 350,
    slower: 500
  },
  
  // Easing functions
  easings: {
    linear: 'linear',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
    easeInQuad: 'cubic-bezier(0.55, 0.085, 0.68, 0.53)',
    easeOutQuad: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    easeInOutQuad: 'cubic-bezier(0.455, 0.03, 0.515, 0.955)',
    easeInCubic: 'cubic-bezier(0.55, 0.055, 0.675, 0.19)',
    easeOutCubic: 'cubic-bezier(0.215, 0.61, 0.355, 1)',
    easeInOutCubic: 'cubic-bezier(0.645, 0.045, 0.355, 1)',
    easeInBack: 'cubic-bezier(0.6, -0.28, 0.735, 0.045)',
    easeOutBack: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    easeInOutBack: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
  }
} as const;

// Utility function para criar animações CSS
export function createAnimation(
  keyframe: keyof typeof animations.keyframes,
  duration: number = animations.durations.normal,
  easing: string = animations.easings.easeInOut,
  delay: number = 0,
  fillMode: 'none' | 'forwards' | 'backwards' | 'both' = 'both'
): string {
  return `${keyframe} ${duration}ms ${easing} ${delay}ms ${fillMode}`;
}

// Utility function para criar transições CSS
export function createTransition(
  properties: string | string[],
  duration: number = animations.durations.normal,
  easing: string = animations.easings.easeInOut,
  delay: number = 0
): string {
  const props = Array.isArray(properties) ? properties : [properties];
  return props
    .map(prop => `${prop} ${duration}ms ${easing} ${delay}ms`)
    .join(', ');
}

// Presets de animações comuns
export const animationPresets = {
  fadeIn: createAnimation('fadeIn', animations.durations.normal),
  fadeOut: createAnimation('fadeOut', animations.durations.normal),
  slideInRight: createAnimation('slideInRight', animations.durations.normal),
  slideInLeft: createAnimation('slideInLeft', animations.durations.normal),
  slideInUp: createAnimation('slideInUp', animations.durations.normal),
  slideInDown: createAnimation('slideInDown', animations.durations.normal),
  scaleIn: createAnimation('scaleIn', animations.durations.fast),
  scaleOut: createAnimation('scaleOut', animations.durations.fast),
  bounce: createAnimation('bounce', 1000),
  pulse: createAnimation('pulse', 2000, animations.easings.easeInOut, 0, 'none'),
  spin: createAnimation('spin', 1000, animations.easings.linear, 0, 'none'),
  ping: createAnimation('ping', 1000, animations.easings.easeInOut, 0, 'none')
} as const;

// Presets de transições comuns
export const transitionPresets = {
  all: createTransition('all'),
  colors: createTransition(['color', 'background-color', 'border-color']),
  transform: createTransition('transform'),
  opacity: createTransition('opacity'),
  shadow: createTransition('box-shadow'),
  size: createTransition(['width', 'height']),
  position: createTransition(['top', 'right', 'bottom', 'left'])
} as const;