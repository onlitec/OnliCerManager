import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a Unix timestamp to a localized date string
 */
export function formatDate(timestamp: number, locale = "pt-BR"): string {
  return new Date(timestamp * 1000).toLocaleDateString(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Calculate days remaining until a Unix timestamp
 */
export function daysUntil(timestamp: number): number {
  const now = Date.now();
  const target = timestamp * 1000;
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
}

/**
 * Determine certificate status based on validity timestamps
 */
export function certStatus(validTo: number): "active" | "expiringSoon" | "expired" {
  const days = daysUntil(validTo);
  if (days <= 0) return "expired";
  if (days <= 30) return "expiringSoon";
  return "active";
}

/**
 * Truncate long strings with ellipsis
 */
export function truncate(str: string, maxLength: number): string {
  return str.length <= maxLength ? str : `${str.slice(0, maxLength)}…`;
}
