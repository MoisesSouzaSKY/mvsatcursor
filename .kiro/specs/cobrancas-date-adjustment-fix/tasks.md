# Implementation Plan

- [x] 1. Create date adjustment service


  - Create utility service for date adjustments with specific day transformation rules
  - Implement functions to check and adjust days 4→5, 29→30, 9→10, 14→15, 19→20
  - Add proper error handling for invalid dates and edge cases
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ]* 1.1 Write property test for day 4 to 5 adjustment
  - **Property 1: Day 4 to 5 Adjustment**
  - **Validates: Requirements 1.1**

- [ ]* 1.2 Write property test for day 29 to 30 adjustment
  - **Property 2: Day 29 to 30 Adjustment**
  - **Validates: Requirements 1.2**

- [ ]* 1.3 Write property test for day 9 to 10 adjustment
  - **Property 3: Day 9 to 10 Adjustment**
  - **Validates: Requirements 1.3**

- [ ]* 1.4 Write property test for day 14 to 15 adjustment
  - **Property 4: Day 14 to 15 Adjustment**
  - **Validates: Requirements 1.4**

- [ ]* 1.5 Write property test for day 19 to 20 adjustment
  - **Property 5: Day 19 to 20 Adjustment**
  - **Validates: Requirements 1.5**



- [ ] 2. Integrate date adjustment into cobrancas processing
  - Modify cobrancas.functions.ts to use date adjustment service
  - Update data processing utilities to apply adjustments


  - Ensure adjustments are applied consistently across all date operations
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ] 3. Create modal components for edit and payment
  - Create EditarCobrancaModal component with form fields and validation
  - Create PagamentoModal component with payment form and file upload
  - Implement proper form state management and validation
  - Add loading states and error handling
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [ ]* 3.1 Write property test for payment modal functionality
  - **Property 6: Payment Modal Opens for Unpaid Charges**
  - **Validates: Requirements 2.2**

- [ ]* 3.2 Write property test for edit form updates
  - **Property 7: Edit Form Updates Cobrança**
  - **Validates: Requirements 2.3**



- [ ]* 3.3 Write property test for payment form functionality
  - **Property 8: Payment Form Marks as Paid**
  - **Validates: Requirements 2.4**

- [ ] 4. Implement modal handlers in CobrancasPage
  - Complete implementation of handleEditCobranca function
  - Complete implementation of handlePayCobranca function
  - Add proper state management for modal visibility and selected cobrança


  - Implement form submission handlers with API calls
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x]* 4.1 Write property test for paid charges button display


  - **Property 9: Paid Charges Show View Button**



  - **Validates: Requirements 2.5**

- [ ] 5. Update VirtualizedCobrancasTable button logic
  - Fix button click handlers to properly call parent functions
  - Ensure proper conditional rendering of edit vs view buttons
  - Add proper button states and loading indicators
  - _Requirements: 2.1, 2.2, 2.5_

- [ ] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Test integration and fix any issues
  - Test complete workflow from date adjustment to modal interactions
  - Verify all button functionalities work correctly
  - Test edge cases and error scenarios
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5_