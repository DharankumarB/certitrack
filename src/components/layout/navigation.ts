import type { NavItem } from '../../config/navigation';

/**
 * Picks the single active navigation item. Items with a matching query string win over plain path
 * matches, so "Pending Review" and "Application Queue" (same path) never highlight together.
 */
export function activeNavIndex(items: NavItem[], pathname: string, search: string): number {
  const params = new URLSearchParams(search);
  let best = -1;
  let bestScore = 0;
  items.forEach((item, index) => {
    const pathMatch = pathname === item.to || pathname.startsWith(`${item.to}/`);
    if (!pathMatch) return;
    let score = 1;
    if (item.query) {
      const matches = Object.entries(item.query).every(([k, v]) => params.get(k) === v);
      if (!matches) return;
      score = 3;
    } else if (items.some((other) => other.query && other.to === item.to && Object.entries(other.query).every(([k, v]) => params.get(k) === v))) {
      score = 2;
    }
    if (score > bestScore) {
      bestScore = score;
      best = index;
    }
  });
  return best;
}
