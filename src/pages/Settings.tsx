import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { clearAllData, getUser, saveUser } from '@/lib/storage';
import { toast } from 'sonner';
import { 
  Settings as SettingsIcon, 
  Bell, 
  Trash2, 
  Info, 
  ChevronRight,
  LogOut
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const Settings = () => {
  const navigate = useNavigate();
  const user = getUser();
  const [remindersEnabled, setRemindersEnabled] = useState(user?.remindersEnabled ?? true);

  const handleRemindersToggle = (enabled: boolean) => {
    setRemindersEnabled(enabled);
    if (user) {
      saveUser({ ...user, remindersEnabled: enabled });
      toast.success(enabled ? 'Reminders enabled' : 'Reminders disabled');
    }
  };

  const handleClearData = () => {
    clearAllData();
    toast.success('All data cleared');
    navigate('/onboarding');
  };

  const handleStartOver = () => {
    clearAllData();
    navigate('/onboarding');
  };

  return (
    <AppLayout title="Settings">
      <div className="space-y-6">
        {/* Notifications */}
        <section>
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
            Notifications
          </h2>
          <div className="card-elevated divide-y divide-border">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium text-foreground">Daily Reminders</p>
                  <p className="text-sm text-muted-foreground">
                    Remind me to log meals
                  </p>
                </div>
              </div>
              <Switch
                checked={remindersEnabled}
                onCheckedChange={handleRemindersToggle}
              />
            </div>
          </div>
        </section>

        {/* About */}
        <section>
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
            About
          </h2>
          <div className="card-elevated divide-y divide-border">
            <button className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <Info className="w-5 h-5 text-primary" />
                <span className="font-medium text-foreground">How It Works</span>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
            <div className="p-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                AcidTrack analyzes your meals and symptoms to find correlations. 
                Log consistently for 7 days to get accurate trigger predictions.
              </p>
            </div>
          </div>
        </section>

        {/* Data Management */}
        <section>
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
            Data
          </h2>
          <div className="card-elevated divide-y divide-border">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <Trash2 className="w-5 h-5 text-destructive" />
                    <span className="font-medium text-destructive">Clear All Data</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear all data?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all your logged meals, symptoms, 
                    and insights. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleClearData}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete Everything
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <LogOut className="w-5 h-5 text-muted-foreground" />
                    <span className="font-medium text-foreground">Start Over</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Start over?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will reset the app and take you back to onboarding. 
                    All data will be deleted.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleStartOver}>
                    Start Over
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </section>

        {/* Version */}
        <div className="text-center text-sm text-muted-foreground pt-4">
          <p>AcidTrack v1.0.0</p>
          <p className="mt-1">Made with 💚 for GERD warriors</p>
        </div>
      </div>
    </AppLayout>
  );
};

export default Settings;
