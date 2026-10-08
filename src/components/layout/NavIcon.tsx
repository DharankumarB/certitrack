import {
  Activity,
  Archive,
  Bell,
  BarChart3,
  Building2,
  ChartColumn,
  CircleHelp,
  ClipboardCheck,
  FilePlus2,
  FolderOpen,
  Lock,
  LayoutDashboard,
  ListChecks,
  Route,
  ScanSearch,
  Settings,
  ShieldCheck,
  UserRound,
  type LucideIcon,
} from 'lucide-react';

const ICONS: Record<string, LucideIcon> = {
  Activity,
  Archive,
  Bell,
  BarChart3,
  Building2,
  ChartColumn,
  CircleHelp,
  ClipboardCheck,
  FilePlus2,
  FolderOpen,
  Lock,
  LayoutDashboard,
  ListChecks,
  Route,
  ScanSearch,
  Settings,
  ShieldCheck,
  UserRound,
};

export function NavIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? CircleHelp;
  return <Icon className={className} aria-hidden="true" />;
}
