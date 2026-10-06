/** "now", "5m", "3h", "2d" */
export function timeAgo(minutes: number) {
  if (minutes < 1) return "now";
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const hours = Math.round(minutes / 60);
  return hours < 24 ? `${hours}h` : `${Math.round(hours / 24)}d`;
}

export const minutesSince = (iso: string) =>
  (Date.now() - new Date(iso).getTime()) / 60000;
