import {
  LayoutDashboard,
  Briefcase,
  TrendingUp,
  RefreshCw,
  Bell,
  Lightbulb,
  Settings,
} from 'lucide-react'

export const NAV_ITEMS = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Portfolio',
    href: '/dashboard/portfolio',
    icon: Briefcase,
  },
  {
    title: 'Markets',
    href: '/dashboard/market',
    icon: TrendingUp,
  },
  {
    title: 'DCA',
    href: '/dashboard/dca',
    icon: RefreshCw,
  },
  {
    title: 'Alerts',
    href: '/dashboard/alerts',
    icon: Bell,
  },
  {
    title: 'Insights',
    href: '/dashboard/insights',
    icon: Lightbulb,
  },
  {
    title: 'Settings',
    href: '/dashboard/settings',
    icon: Settings,
  },
] as const
