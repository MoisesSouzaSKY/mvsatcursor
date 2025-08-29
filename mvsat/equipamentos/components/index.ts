// Componentes principais
export { StatusBadge } from './StatusBadge';
export { StatisticsCards } from './StatisticsCards';
export { FilterSection } from './FilterSection';
export { DataTable } from './DataTable';
export { EquipmentModal } from './EquipmentModal';

// Novos componentes no estilo da aba de Despesas
export { default as EquipamentosHeader } from './EquipamentosHeader';
export { default as EquipamentosStatistics } from './EquipamentosStatistics';
export { default as EquipamentosFilters } from './EquipamentosFilters';
export { default as StatCard } from './StatCard';
export { default as ResponsiveLayout } from './ResponsiveLayout';

// Navegação e layout
export { TabNavigation, TabContent, TabPanel, useTabs } from './TabNavigation';
export { 
  ResponsiveGrid, 
  ResponsiveContainer, 
  ResponsiveTable, 
  ResponsiveModal,
  ResponsiveFilters,
  ResponsiveStats,
  ResponsiveActions,
  useBreakpoint,
  useResponsiveStyles
} from './ResponsiveLayout';

// Botões e ações
export { 
  Button, 
  IconButton, 
  ButtonGroup, 
  ActionBar,
  AddButton,
  EditButton,
  ViewButton,
  DeleteButton,
  RefreshButton,
  ExportButton
} from './ActionButtons';

// Feedback e notificações
export { 
  ErrorDisplay,
  Toast,
  ConfirmDialog,
  LoadingSpinner,
  EmptyState,
  FeedbackProvider,
  useFeedback,
  useToast
} from './FeedbackComponents';

// Acessibilidade
export {
  AccessibleInput,
  AccessibleButton,
  AccessibleLabel,
  AccessibleIcon,
  AccessibleTable,
  KeyboardNavigation,
  FocusIndicator,
  LiveRegion,
  SkipLink,
  useFocusManagement,
  useScreenReader
} from './AccessibilityComponents';

// Animações
export { AnimationProvider, useAnimations } from './AnimationProvider';

// Performance
export {
  useDebounce,
  useThrottle,
  useMemoizedCalculation,
  useDataCache,
  usePagination,
  useVirtualization,
  useStableCallback,
  useLazyLoading,
  useOptimizedFilter,
  useOptimizedSort,
  useOptimizedState,
  useIntersectionObserver,
  useAnimationFrame,
  usePerformanceMonitor,
  LazyComponent
} from '../hooks/usePerformanceOptimization';