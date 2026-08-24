/**
 * Date Adjustment Service
 * 
 * Provides functionality to automatically adjust specific days in dates
 * according to business rules:
 * - Day 4 → Day 5
 * - Day 29 → Day 30
 * - Day 9 → Day 10
 * - Day 14 → Day 15
 * - Day 19 → Day 20
 */

export interface DateAdjustmentService {
  adjustDueDate(date: Date): Date;
  shouldAdjustDay(day: number): boolean;
  getAdjustedDay(day: number): number;
}

/**
 * Mapping of days that need adjustment
 */
const DAY_ADJUSTMENTS: Record<number, number> = {
  4: 5,
  29: 30,
  9: 10,
  14: 15,
  19: 20
};

/**
 * Checks if a given day should be adjusted
 */
export function shouldAdjustDay(day: number): boolean {
  return day in DAY_ADJUSTMENTS;
}

/**
 * Gets the adjusted day for a given day
 */
export function getAdjustedDay(day: number): number {
  return DAY_ADJUSTMENTS[day] || day;
}

/**
 * Adjusts a date according to the day adjustment rules
 * 
 * @param date - The date to adjust
 * @returns A new Date object with the adjusted day, or the original date if no adjustment needed
 */
export function adjustDueDate(date: Date): Date {
  // Validate input
  if (!date || isNaN(date.getTime())) {
    console.warn('[DATE ADJUSTMENT] Invalid date provided, returning original:', date);
    return date;
  }

  const currentDay = date.getDate();
  
  // Check if this day needs adjustment
  if (!shouldAdjustDay(currentDay)) {
    return date;
  }

  const adjustedDay = getAdjustedDay(currentDay);
  
  // Create new date with adjusted day
  const adjustedDate = new Date(date);
  
  try {
    // Get the last day of the current month to handle edge cases
    const year = adjustedDate.getFullYear();
    const month = adjustedDate.getMonth();
    const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
    
    // If the adjusted day would exceed the month's last day, use the last day
    const finalDay = Math.min(adjustedDay, lastDayOfMonth);
    
    adjustedDate.setDate(finalDay);
    
    console.log(`[DATE ADJUSTMENT] Adjusted day ${currentDay} → ${finalDay} for date:`, {
      original: date.toISOString().split('T')[0],
      adjusted: adjustedDate.toISOString().split('T')[0]
    });
    
    return adjustedDate;
  } catch (error) {
    console.error('[DATE ADJUSTMENT] Error adjusting date:', error);
    return date; // Return original date on error
  }
}

/**
 * Adjusts a date string in YYYY-MM-DD format
 * 
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns Adjusted date string in the same format
 */
export function adjustDueDateString(dateString: string): string {
  try {
    // Parse the date string ensuring local timezone interpretation
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day); // month - 1 because months are 0-indexed
    
    const adjustedDate = adjustDueDate(date);
    
    // Format back to YYYY-MM-DD
    const adjustedYear = adjustedDate.getFullYear();
    const adjustedMonth = String(adjustedDate.getMonth() + 1).padStart(2, '0');
    const adjustedDay = String(adjustedDate.getDate()).padStart(2, '0');
    
    return `${adjustedYear}-${adjustedMonth}-${adjustedDay}`;
  } catch (error) {
    console.error('[DATE ADJUSTMENT] Error adjusting date string:', error);
    return dateString; // Return original string on error
  }
}

/**
 * Default export object implementing the DateAdjustmentService interface
 */
const dateAdjustmentService: DateAdjustmentService = {
  adjustDueDate,
  shouldAdjustDay,
  getAdjustedDay
};

export default dateAdjustmentService;