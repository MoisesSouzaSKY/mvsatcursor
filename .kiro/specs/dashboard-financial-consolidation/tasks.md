# Implementation Plan

- [x] 1. Create core project structure and TypeScript interfaces


  - Set up directory structure for consolidated financial card components
  - Define TypeScript interfaces for financial data, period filters, and component props
  - Create base types for cobranças and despesas data structures
  - _Requirements: 1.1, 1.2, 1.3_



- [x] 2. Implement financial calculations utility module

  - [x] 2.1 Create financial calculations utility functions


    - Write functions to calculate "Received" from paid collections in selected period
    - Write functions to calculate "Receivable" with value and count from open collections
    - Write functions to calculate "Overdue" with value and count from overdue collections
    - Write functions to calculate total expenses by period and breakdown by categories
    - _Requirements: 3.1, 3.2, 3.3, 4.1, 4.2_



  - [ ] 2.2 Create consolidated financial calculations
    - Implement "Gross" calculation (received value)
    - Implement "Net" calculation (gross minus expenses)
    - Create period filtering logic for both collections and expenses
    - Add unit tests for all calculation functions

    - _Requirements: 5.1, 5.2, 5.3, 8.1, 8.2_





- [ ] 3. Build period filter component
  - [x] 3.1 Create PeriodFilter component with dropdown options


    - Implement dropdown with options: Today, Week, Month, Custom
    - Set default period to "Current Month"
    - Create date range picker for "Custom" option

    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 3.2 Implement period filter logic and state management


    - Create usePeriodFilter hook for state management
    - Implement date range calculation for each period type
    - Add validation for custom date ranges
    - Create callback system for period changes
    - _Requirements: 2.4, 8.3_

- [ ] 4. Create data aggregation hook
  - [x] 4.1 Build useFinancialData hook for data loading and aggregation

    - Load cobranças and despesas data from Firebase collections


    - Apply period filtering to loaded data
    - Aggregate data using financial calculation utilities

    - Handle loading and error states for both data sources
    - _Requirements: 3.1, 3.2, 3.3, 4.1, 4.2, 8.1_




  - [ ] 4.2 Implement data caching and performance optimization
    - Add memoization for expensive calculations
    - Implement caching for same period calculations
    - Add debounced updates for period filter changes
    - Create fallback data structure for error scenarios
    - _Requirements: 8.2, 8.3_




- [ ] 5. Build KPI section component
  - [ ] 5.1 Create KPISection component for main financial metrics
    - Display "Bruto (Recebido)" with large value formatting
    - Display "Despesas (Total)" with category mini-legend
    - Display "Líquido" with positive/negative visual indicators

    - Apply proper currency formatting (R$ 0.000,00)


    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 7.1_

  - [ ] 5.2 Implement visual indicators and styling
    - Add green styling for positive líquido values
    - Add neutral styling for zero líquido values



    - Add attention styling for negative líquido values
    - Ensure consistent visual hierarchy with large value display

    - _Requirements: 5.4, 5.5, 7.2_

- [x] 6. Build cobranças status section

  - [x] 6.1 Create CobrancasSection component for receivables status


    - Display "A receber" with value and quantity of títulos
    - Display "Em atraso" with value and quantity of títulos
    - Format values using standard currency formatting
    - Position as second line in card layout
    - _Requirements: 3.4, 6.2, 7.1_





  - [ ] 6.2 Add proper data binding and formatting
    - Connect to aggregated financial data from useFinancialData hook
    - Implement proper number formatting for quantities
    - Add responsive layout for different screen sizes
    - _Requirements: 3.4, 7.1, 7.2_


- [ ] 7. Build despesas breakdown section
  - [ ] 7.1 Create DespesasBreakdown component for category visualization
    - Display despesas by category (IPTV, Assinaturas, Outros)
    - Create mini horizontal bars with values and percentages
    - Calculate and display percentage distribution
    - Position as third line in card layout

    - _Requirements: 4.2, 4.3, 6.3_



  - [x] 7.2 Implement category calculation and display logic

    - Map origemTipo to appropriate categories (IPTV, Assinaturas, Outros)
    - Calculate percentage distribution for each category

    - Create horizontal bar visualization with proper proportions
    - Add value and percentage labels for each category
    - _Requirements: 4.2, 4.3, 6.3_



- [ ] 8. Create main consolidated financial card component
  - [x] 8.1 Build ConsolidatedFinancialCard main component structure


    - Create card container with proper styling and positioning
    - Implement header with title "Financeiro (Consolidado)" and period filter

    - Integrate all sub-components (KPI, Cobranças, Despesas breakdown)
    - Apply consistent card styling with existing dashboard cards
    - _Requirements: 1.1, 1.2, 6.1, 7.2_


  - [ ] 8.2 Implement card layout and responsive design
    - Position card below three main dashboard cards
    - Set card width to occupy full line or 2 columns
    - Ensure proper margins and shadows consistent with other cards
    - Add responsive behavior for different screen sizes
    - _Requirements: 1.2, 1.3, 7.2_





- [ ] 9. Add navigation and footer functionality
  - [ ] 9.1 Implement "Ver detalhes" navigation link
    - Create link that opens Cobranças/Despesas pages with applied filters
    - Pass current period filter to detail pages
    - Position link in card footer


    - _Requirements: 7.3_



  - [ ] 9.2 Add footer with period information
    - Display "Valores referentes ao período selecionado" message
    - Position footer at bottom of card


    - Ensure consistent styling with card design





    - _Requirements: 7.4_



- [x] 10. Integrate with dashboard and add error handling




  - [ ] 10.1 Integrate consolidated card into Dashboard component
    - Import and add ConsolidatedFinancialCard to Dashboard.tsx




    - Position card in correct location within dashboard grid
    - Remove or replace existing separate financial cards
    - Test integration with existing dashboard data loading
    - _Requirements: 1.1, 1.2, 8.1_



  - [ ] 10.2 Implement comprehensive error handling
    - Add loading states for all data operations
    - Implement error boundaries for component failures
    - Create fallback UI for data loading failures
    - Add retry functionality for failed data loads
    - Display appropriate error messages to users
    - _Requirements: 8.1, 8.2_

- [ ] 11. Add comprehensive testing
  - [ ] 11.1 Create unit tests for calculation utilities
    - Test all financial calculation functions with various data scenarios
    - Test period filtering logic with different date ranges
    - Test edge cases (empty data, invalid dates, null values)
    - Test currency and number formatting functions
    - _Requirements: 8.1, 8.2, 8.3_

  - [ ] 11.2 Create component integration tests
    - Test complete data flow from loading to display
    - Test period filter integration with calculations
    - Test error handling across all components
    - Test responsive behavior and accessibility features
    - _Requirements: 8.1, 8.2, 8.3_

- [ ] 12. Performance optimization and accessibility
  - [ ] 12.1 Implement performance optimizations
    - Add React.memo for expensive calculation components
    - Implement proper cleanup for component unmounting
    - Optimize re-rendering with proper dependency arrays
    - Test performance with large datasets (1000+ records)
    - _Requirements: 8.2, 8.3_

  - [ ] 12.2 Add accessibility features
    - Add proper ARIA labels for all financial data displays
    - Ensure keyboard navigation for period filter
    - Verify color contrast for positive/negative indicators
    - Add screen reader support for chart elements
    - Test with accessibility tools and screen readers
    - _Requirements: 7.2_