import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function QuickStartGuide() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Show guide only on first login for each role
    const guideKey = `quickstart_${user?.role}_shown`;
    const hasSeenGuide = localStorage.getItem(guideKey);
    
    if (!hasSeenGuide && user) {
      setOpen(true);
    }
  }, [user]);

  const handleClose = () => {
    if (user) {
      localStorage.setItem(`quickstart_${user.role}_shown`, 'true');
    }
    setOpen(false);
  };

  const getGuideContent = () => {
    switch (user?.role) {
      case 'admin':
        return {
          title: 'Welcome, Administrator!',
          steps: [
            'Review pending delivery requests in the "Pending" tab',
            'Click "Approve" to assign a rider to the delivery',
            'View all scheduled deliveries in the "Calendar View"',
            'Monitor delivery status updates from riders',
            'Check notifications for new requests',
          ],
        };
      case 'personnel':
        return {
          title: 'Welcome, Department Personnel!',
          steps: [
            'Click "New Request" to submit a delivery request',
            'Select delivery date using the calendar',
            'Choose a time window from the dropdown',
            'Pick locations on the map (pickup and drop-off)',
            'Track your request status and assigned rider',
          ],
        };
      case 'rider':
        return {
          title: 'Welcome, Rider!',
          steps: [
            'Check the "Today" tab for deliveries scheduled today',
            'View "Tomorrow" tab to prepare for next day',
            'Click on any delivery to see full details',
            'Update delivery status as you progress',
            'Add notes or remarks for each delivery',
          ],
        };
      default:
        return null;
    }
  };

  const content = getGuideContent();
  if (!content) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{content.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Here's a quick guide to get you started:
          </p>

          <div className="space-y-3">
            {content.steps.map((step, index) => (
              <div key={index} className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-semibold">
                  {index + 1}
                </div>
                <p className="text-sm pt-0.5">{step}</p>
              </div>
            ))}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
            <p className="text-sm text-blue-900 flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
              Click the "System Info" button in the header anytime for help and demo account details.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleClose} className="w-full">
            Got it, let's start!
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
