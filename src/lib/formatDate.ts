import { DualDate } from '@/types';

/** Format ISO/Date string → DD/MM/YYYY */
export function formatDate(dateString: string | undefined | null): string {
  if (!dateString) return '';

  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
}

/** Format DualDate → "DD/MM/YYYY (âm: ngày X tháng Y[ nhuận])" */
export function formatDualDate(d: DualDate | undefined | null): string {
  if (!d) return '';

  const solarStr = formatDate(d.solar);
  if (!d.lunar || (!d.lunar.day && !d.lunar.month)) return solarStr;

  const { day, month, year, isLeap } = d.lunar;
  const parts: string[] = [];
  if (day) parts.push(`ngày ${day}`);
  if (month) parts.push(`tháng ${month}${isLeap ? ' nhuận' : ''}`);
  if (year) parts.push(`năm ${year}`);

  const lunarStr = parts.join(' ');
  return solarStr ? `${solarStr} (âm: ${lunarStr})` : `Âm: ${lunarStr}`;
}

/** Lấy solar string từ DualDate để dùng với input[type=date] */
export function toInputDateFormat(dateString: string | undefined | null): string {
  if (!dateString) return '';

  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';

  return date.toISOString().split('T')[0];
}

/** Lấy solar string từ DualDate để dùng với input[type=date] */
export function dualToInput(d: DualDate | undefined | null): string {
  if (!d) return '';
  return toInputDateFormat(d.solar);
}
