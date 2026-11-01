import {
  LayoutDashboard,
  CalendarPlus,
  CalendarClock,
  CircleDollarSign,
  ClipboardCheck,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  disabled?: boolean;
  disabledReason?: string;
}

export const navItems: NavItem[] = [
  {
    name: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    name: "Plan a Celebration",
    href: "/events/new",
    icon: CalendarPlus,
  },
  {
    name: "Timeline Planner",
    href: "/timeline",
    icon: CalendarClock,
  },
  {
    name: "Budget Calculator",
    href: "/budget",
    icon: CircleDollarSign,
  },
  {
    name: "Vendor Checklist",
    href: "/vendors",
    icon: ClipboardCheck,
  },
];
