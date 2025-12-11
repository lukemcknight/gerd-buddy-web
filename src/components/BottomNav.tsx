import { Link, useLocation } from 'react-router-dom';
import { Home, BarChart3, FileText, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/insights', icon: BarChart3, label: 'Insights' },
  { path: '/report', icon: FileText, label: 'Report' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

export const BottomNav = () => {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border safe-area-bottom">
      <div className="container max-w-md mx-auto">
        <div className="flex items-center justify-around py-2">
          {navItems.map(({ path, icon: Icon, label }) => {
            const isActive = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                className={cn(
                  'flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-200',
                  isActive 
                    ? 'text-primary' 
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <div className={cn(
                  'p-2 rounded-xl transition-all duration-200',
                  isActive && 'bg-primary-light'
                )}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-xs font-medium">{label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
