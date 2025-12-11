import { ReactNode } from 'react';
import { BottomNav } from './BottomNav';
import { cn } from '@/lib/utils';

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
  showNav?: boolean;
  className?: string;
}

export const AppLayout = ({ children, title, showNav = true, className }: AppLayoutProps) => {
  return (
    <div className="min-h-screen bg-background">
      {title && (
        <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border/50">
          <div className="container max-w-md mx-auto px-4 py-4">
            <h1 className="text-xl font-display font-bold text-foreground">{title}</h1>
          </div>
        </header>
      )}
      <main className={cn(
        'container max-w-md mx-auto px-4 py-6',
        showNav && 'pb-28',
        className
      )}>
        {children}
      </main>
      {showNav && <BottomNav />}
    </div>
  );
};
