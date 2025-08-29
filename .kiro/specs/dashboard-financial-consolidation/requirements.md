# Requirements Document

## Introduction

This document defines the requirements for creating a Unified Financial Card on the dashboard that will consolidate the current separate cards "Financial — Collections" and "Financial — Expenses" into a single, broader and more informative interface. The goal is to improve financial summary visualization without changing existing business rules, focusing only on data aggregation and UI improvements.

## Requirements

### Requirement 1

**User Story:** As a MVSAT system user, I want to view a consolidated financial card on the dashboard, so that I can have a unified and clearer view of the company's financial situation.

#### Acceptance Criteria

1. WHEN the dashboard is loaded THEN the system SHALL display a single "Financial (Consolidated)" card positioned below the three top cards (Clients, TV Box Equipment, Sky Equipment)
2. WHEN the financial card is rendered THEN the system SHALL occupy a larger width (2 columns or 100% of the line) to highlight the financial summary
3. WHEN the card is displayed THEN the system SHALL maintain the same margins and shadows as other dashboard cards

### Requirement 2

**User Story:** As a user, I want to filter financial data by period, so that I can analyze the financial situation in different time intervals.

#### Acceptance Criteria

1. WHEN the financial card is loaded THEN the system SHALL set the default filter as "Current Month"
2. WHEN the user accesses the period selector THEN the system SHALL offer the options: Today, Week, Month, Custom (start and end date)
3. WHEN a period is selected THEN the system SHALL update all card values respecting the chosen period
4. WHEN the "Custom" option is selected THEN the system SHALL allow selection of start and end dates

### Requirement 3

**User Story:** As a user, I want to view consolidated collection data, so that I can track received revenue, receivables, and overdue amounts.

#### Acceptance Criteria

1. WHEN the card is loaded THEN the system SHALL calculate "Received" as the sum of PAID collections in the selected period
2. WHEN the card is loaded THEN the system SHALL calculate "Receivable" as the sum of OPEN collections with due dates within the period
3. WHEN the card is loaded THEN the system SHALL calculate "Overdue" as the sum of UNPAID collections with due dates before the current date, regardless of the filter period
4. WHEN "Receivable" and "Overdue" values are displayed THEN the system SHALL show both the monetary value and the quantity of titles

### Requirement 4

**User Story:** As a user, I want to view consolidated expense data, so that I can track total costs and costs by category.

#### Acceptance Criteria

1. WHEN the card is loaded THEN the system SHALL calculate the total expenses in the selected period
2. WHEN expenses are calculated THEN the system SHALL provide breakdown by category (IPTV, Subscriptions, Others)
3. WHEN categories are displayed THEN the system SHALL show values and percentages for each category

### Requirement 5

**User Story:** As a user, I want to view the main financial calculations (Gross, Expenses, Net), so that I can have a clear view of financial performance.

#### Acceptance Criteria

1. WHEN the card is loaded THEN the system SHALL calculate "Gross (Gross Revenue)" as the value received from paid collections in the period
2. WHEN the card is loaded THEN the system SHALL calculate "Expenses (Total Cost)" as the sum of all expenses in the period
3. WHEN the card is loaded THEN the system SHALL calculate "Net" as Gross minus Expenses
4. WHEN the net value is positive THEN the system SHALL display it in green highlight
5. WHEN the net value is zero THEN the system SHALL display it in neutral tone
6. WHEN the net value is negative THEN the system SHALL display it in warning tone

### Requirement 6

**User Story:** As a user, I want an organized and visually consistent interface, so that I can easily navigate through financial information.

#### Acceptance Criteria

1. WHEN the card is rendered THEN the system SHALL display header with "Financial (Consolidated)" and period selector on the right
2. WHEN main KPIs are displayed THEN the system SHALL show Gross, Expenses and Net in large values on the first line
3. WHEN collection status is displayed THEN the system SHALL show "Receivable" and "Overdue" with values and quantities on the second line
4. WHEN detailed breakdowns are displayed THEN the system SHALL show expenses by category in mini horizontal bars on the third line
5. WHEN space is available THEN the system SHALL display collection distribution in mini pie chart

### Requirement 7

**User Story:** As a user, I want consistent monetary formatting and navigation to details, so that I can have a uniform experience and access to more detailed information.

#### Acceptance Criteria

1. WHEN monetary values are displayed THEN the system SHALL use the standard R$ 0.000,00 format
2. WHEN the card is rendered THEN the system SHALL maintain the same visual standard as other cards (shadow, border, padding)
3. WHEN the user wants more details THEN the system SHALL provide a "View details" link that opens the Collections/Expenses screen already filtered
4. WHEN the footer is displayed THEN the system SHALL show the note "Values referring to the selected period"
5. WHEN the card is displayed THEN the system SHALL maintain a formal, modern and clean style, avoiding excessive colors

### Requirement 8

**User Story:** As a user, I want data to be calculated correctly without duplication, so that I can trust the accuracy of financial information.

#### Acceptance Criteria

1. WHEN data is aggregated THEN the system SHALL sum collections and expenses correctly without duplicating records
2. WHEN calculations are performed THEN the system SHALL keep all existing business rules unchanged
3. WHEN the period is changed THEN the system SHALL recalculate all values respecting the new filter
4. WHEN data is displayed THEN the system SHALL ensure consistency between all values shown on the card