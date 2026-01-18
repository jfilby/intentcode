export class QuotaUtilsService {

  // Consts
  clName = 'QuotaUtilsService'

  // Code
  getNextMonthSameDay(startDate: Date): Date {

    const year = startDate.getFullYear()
    const month = startDate.getMonth()
    const day = startDate.getDate()

    // Try to construct the same day in the next month
    const nextMonth = new Date(year, month + 1, day)

    // If that day doesn't exist in the next month (e.g., Feb 30), JavaScript
    // rolls over to the next valid date. So we clamp it to the last valid day
    // of the next month.
    if (nextMonth.getDate() !== day) {

      // Date overflowed, so adjust to the last day of the next month
      // Day 0 of the month after = last day of next month
      const lastDayOfNextMonth = new Date(year, month + 2, 0)
      return lastDayOfNextMonth
    }

    return nextMonth
  }
}
