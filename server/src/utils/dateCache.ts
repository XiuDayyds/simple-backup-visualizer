// Date formatting cache to avoid repeated date parsing and formatting
export class DateCache {
  private cache: Map<string, {
    formattedDate: string;
    formattedDateSimple: string;
    yearMonth: string;
    yearMonthTitle: string;
    timestamp: number;
  }> = new Map();

  formatDate(dateString: string): string {
    const cached = this.getOrCreate(dateString);
    return cached.formattedDate;
  }

  formatDateSimple(dateString: string): string {
    const cached = this.getOrCreate(dateString);
    return cached.formattedDateSimple;
  }

  getYearMonth(dateString: string): string {
    const cached = this.getOrCreate(dateString);
    return cached.yearMonth;
  }

  getYearMonthTitle(yearMonth: string): string {
    // For year-month format strings like "2024-01"
    if (yearMonth.includes('-')) {
      try {
        const [year, month] = yearMonth.split('-');
        return `${year}年${parseInt(month)}月`;
      } catch (error) {
        return yearMonth;
      }
    }
    return yearMonth;
  }

  getTimestamp(dateString: string): number {
    const cached = this.getOrCreate(dateString);
    return cached.timestamp;
  }

  private getOrCreate(dateString: string) {
    if (this.cache.has(dateString)) {
      return this.cache.get(dateString)!;
    }

    try {
      const date = new Date(dateString);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        const fallback = {
          formattedDate: dateString || '日期无效',
          formattedDateSimple: dateString || '日期无效',
          yearMonth: 'unknown',
          yearMonthTitle: 'unknown',
          timestamp: 0
        };
        this.cache.set(dateString, fallback);
        return fallback;
      }

      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const yearMonth = `${year}-${month}`;

      const result = {
        formattedDate: date.toLocaleString('zh-CN', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          weekday: 'long',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }),
        formattedDateSimple: date.toLocaleString('zh-CN', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        yearMonth,
        yearMonthTitle: `${year}年${parseInt(month)}月`,
        timestamp: date.getTime()
      };

      this.cache.set(dateString, result);
      return result;
    } catch (error) {
      const fallback = {
        formattedDate: dateString || '日期无效',
        formattedDateSimple: dateString || '日期无效',
        yearMonth: 'unknown',
        yearMonthTitle: 'unknown',
        timestamp: 0
      };
      this.cache.set(dateString, fallback);
      return fallback;
    }
  }

  clear() {
    this.cache.clear();
  }
}