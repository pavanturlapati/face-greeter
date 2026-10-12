export type Period = "morning" | "afternoon" | "evening" | "night";

export function getPeriod(date: Date = new Date()): Period {
  const h = date.getHours();
  if (h >= 5 && h < 12) return "morning";
  if (h >= 12 && h < 17) return "afternoon";
  if (h >= 17 && h < 21) return "evening";
  return "night";
}

export function greeting(date: Date = new Date(), name?: string): string {
  const base = `Good ${getPeriod(date)}`;
  return name ? `${base}, ${name}!` : `${base}!`;
}
