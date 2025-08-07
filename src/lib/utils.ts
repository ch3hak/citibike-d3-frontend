import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"


export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNumber(num: number | string | null | undefined): string {
  if (num == null) return "--";
  return Number(num).toLocaleString();
}

export function classifyStationActivity(
  trips: number,
  maxTrips: number
): { level: 'High Activity' | 'Medium Activity' | 'Low Activity'; color: string } {
  const ratio = trips / maxTrips;
  if (ratio > 0.7) {
    return { level: 'High Activity', color: '#EF4444' };
  }
  if (ratio > 0.4) {
    return { level: 'Medium Activity', color: '#F59E0B' };
  }
  return { level: 'Low Activity', color: '#94A3B8' };
}


export function getHourLabel(hour: number): string {
  if (isNaN(hour) || hour < 0 || hour > 23) return "--";
  const period = hour < 12 ? "AM" : "PM";
  const hour12 = ((hour + 11) % 12) + 1;
  return `${hour12} ${period}`;
}

export function formatDuration(minutes: number | string | null | undefined): string {
  if (minutes == null || isNaN(Number(minutes))) return "–";
  const totalMinutes = Math.floor(Number(minutes));
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;

  if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h`;
  return `${mins} min`;
}