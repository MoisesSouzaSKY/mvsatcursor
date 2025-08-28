# Implementation Plan

- [ ] 1. Create MonthlyFilter component
  - Implement MonthlyFilter component with month selection dropdown
  - Generate month options for current year (Janeiro to Dezembro)
  - Add proper styling matching existing design patterns
  - Include loading state and proper event handling
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ] 2. Create CentralizedActionButton component
  - Implement centralized action button component for "Nova Despesa"
  - Apply enhanced styling with hover effects and transitions
  - Position button centrally above the table
  - Add loading state and proper click handling
  - _Requirements: 5.1, 5.2, 5.4_

- [ ] 3. Create NewExpenseModal component
  - Implement modal component with form for creating new expenses
  - Add form fields: descrição, valor, dataVencimento, categoria, observações
  - Implement form validation for required fields
  - Add category dropdown with predefined options (Aluguel, Energia, etc.)
  - Include proper modal animations and backdrop
  - _Requirements: 6.1, 6.2, 6.4, 6.5, 7.1, 7.2, 7.3_

- [ ] 4. Implement form validation and submission logic
  - Add client-side validation for all form fields
  - Implement proper error message display
  - Add form submission logic to create expense in database
  - Generate competência automatically from dataVencimento
  - Set default values (status: 'pendente', origemTipo: 'MANUAL')
  - _Requirements: 6.2, 6.3, 6.6, 7.4, 7.5_

- [ ] 5. Modify DespesasHeader component
  - Remove "📋Lista de Despesas" title from header
  - Remove "Gerencie todas as suas despesas em um só lugar" subtitle
  - Remove export button from header actions
  - Keep only the gradient banner with minimal branding
  - Update component props to remove onExportar
  - _Requirements: 1.1, 1.2, 4.1, 4.2_

- [ ] 6. Modify DespesasFilters component
  - Remove status filter dropdown from filters section
  - Remove export button from filters
  - Replace complex date range filter with MonthlyFilter component
  - Update component interface to remove statusFilter and onExport props
  - Maintain search functionality and clear filters button
  - _Requirements: 1.3, 2.1, 2.2, 3.1_

- [ ] 7. Update DespesasPage state management
  - Remove statusFilter state variable
  - Remove dateRangeFilter state and replace with selectedMonth
  - Add showNewExpenseModal and newExpenseLoading state
  - Update filtering logic to use monthly filter instead of complex date ranges
  - Remove export-related handlers
  - _Requirements: 2.3, 3.2, 5.3_

- [ ] 8. Implement monthly filtering logic
  - Update filteredDespesas logic to filter by selectedMonth
  - Remove status filtering logic
  - Keep search term filtering functionality
  - Ensure filtering works with competência field
  - Update clear filters functionality for new filter structure
  - _Requirements: 3.2, 3.3, 3.4_

- [ ] 9. Integrate NewExpenseModal in DespesasPage
  - Add NewExpenseModal to page component
  - Implement handleNovaDesepsa to open modal
  - Add handleCreateExpense function to process form submission
  - Update local state after successful expense creation
  - Add proper error handling and success notifications
  - _Requirements: 5.3, 6.3, 6.4, 6.6_

- [ ] 10. Update page layout and positioning
  - Position CentralizedActionButton between filters and table
  - Remove export buttons from all locations
  - Update responsive layout to accommodate new button position
  - Ensure proper spacing and alignment
  - Test layout on different screen sizes
  - _Requirements: 5.1, 5.2, 1.1, 1.2_

- [ ] 11. Add success and error handling
  - Implement toast notifications for successful expense creation
  - Add error handling for form submission failures
  - Display validation errors in modal form
  - Add loading states during expense creation
  - Ensure proper modal closing after successful submission
  - _Requirements: 6.4, 6.6_

- [ ] 12. Test and refine user experience
  - Test complete flow from opening modal to creating expense
  - Verify monthly filtering works correctly
  - Test form validation with various input scenarios
  - Ensure interface is cleaner without removed elements
  - Test responsive behavior on mobile devices
  - _Requirements: All requirements validation_