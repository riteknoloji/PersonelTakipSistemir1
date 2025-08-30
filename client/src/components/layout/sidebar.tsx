import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { 
  Users, 
  Building, 
  Clock, 
  Calendar, 
  QrCode, 
  BarChart3, 
  LayoutDashboard,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface SidebarProps {
  open: boolean;
  collapsed: boolean;
  onClose: () => void;
}

const menuItems = [
  {
    name: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    name: "Personel Yönetimi",
    href: "/personnel",
    icon: Users,
  },
  {
    name: "Şube Yönetimi",
    href: "/branches",
    icon: Building,
  },
  {
    name: "Vardiya Yönetimi", 
    href: "/shifts",
    icon: Clock,
  },
  {
    name: "İzin Yönetimi",
    href: "/leave",
    icon: Calendar,
  },
  {
    name: "QR Kod Kontrol",
    href: "/qr-control",
    icon: QrCode,
  },
  {
    name: "Raporlar",
    href: "/reports",
    icon: BarChart3,
  },
];

export default function Sidebar({ open, collapsed, onClose }: SidebarProps) {
  const { user } = useAuth();
  const [location] = useLocation();

  const userInitials = user?.name
    ?.split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase() || "??";

  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden" 
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed inset-y-0 left-0 z-50 bg-card border-r border-border transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
          collapsed ? "w-16" : "w-64"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-border">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-primary-foreground" />
              </div>
              {!collapsed && (
                <span className="font-semibold text-lg text-foreground">PTS</span>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="md:hidden"
              data-testid="button-close-sidebar"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Navigation Menu */}
          <nav className="flex-1 px-4 py-4 space-y-2">
            {menuItems.map((item) => {
              const isActive = location === item.href || 
                (item.href !== "/" && location.startsWith(item.href));
              
              return (
                <Link key={item.name} href={item.href}>
                  <a 
                    className={cn(
                      "flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors",
                      isActive 
                        ? "bg-primary text-primary-foreground" 
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    )}
                    data-testid={`link-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <item.icon className="w-5 h-5" />
                    {!collapsed && (
                      <span className="sidebar-text">{item.name}</span>
                    )}
                  </a>
                </Link>
              );
            })}
          </nav>

          {/* User Profile */}
          <div className="p-4 border-t border-border">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-accent-foreground">
                  {userInitials}
                </span>
              </div>
              {!collapsed && (
                <div className="sidebar-text">
                  <p className="text-sm font-medium" data-testid="text-user-name">
                    {user?.name}
                  </p>
                  <p className="text-xs text-muted-foreground" data-testid="text-user-role">
                    {user?.role === 'super_admin' ? 'Süper Admin' :
                     user?.role === 'admin' ? 'Admin' : 'Şube Admin'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
