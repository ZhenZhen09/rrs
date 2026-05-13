import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../ui/sheet';
import { Bell, CheckCheck } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export function NotificationBell() {
  const { user } = useAuth();
  const { notifications, markNotificationRead, markAllNotificationsRead, requests } = useData();
  const [isNotificationSheetOpen, setIsNotificationSheetOpen] = useState(false);

  // Filter notifications for current user and exclude those linked to completed/failed transactions
  const myNotifications = (Array.isArray(notifications) ? notifications : []).filter(n => {
    if (n.user_id !== user?.id) return false;
    
    if (n.request_id && Array.isArray(requests)) {
      const request = requests.find(r => r.request_id === n.request_id);
      if (request && (request.delivery_status === 'completed' || request.delivery_status === 'failed')) {
        return false;
      }
    }
    return true;
  }).slice(0, 50);

  const unreadCount = myNotifications.filter(n => !n.read).length;

  const handleNotificationClick = (notificationId: string, requestId?: string) => {
    markNotificationRead(notificationId);
    
    if (requestId) {
      setIsNotificationSheetOpen(false);
      const element = document.getElementById(`request-${requestId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.classList.add('ring-4', 'ring-primary/50', 'ring-offset-2', 'transition-all', 'duration-500');
        setTimeout(() => {
          element.classList.remove('ring-4', 'ring-primary/50', 'ring-offset-2');
        }, 2000);
      }
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'request_submitted': return '📝';
      case 'request_approved': return '✅';
      case 'request_disapproved': return '❌';
      case 'rider_assigned': return '🚚';
      case 'delivery_reminder': return '⏰';
      default: return '🔔';
    }
  };

  return (
    <Sheet open={isNotificationSheetOpen} onOpenChange={setIsNotificationSheetOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="relative rounded-lg h-7 w-7 border-slate-200 bg-white hover:bg-slate-50 transition-all">
          <Bell className="h-4 w-4 text-slate-500" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-3.5 w-3.5 flex items-center justify-center p-0 text-[7px] bg-rose-500 border-white rounded-full font-black shadow-sm">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-xs border-l border-slate-100 shadow-2xl p-0 flex flex-col">
        <SheetHeader className="p-4 border-b border-slate-50 text-left">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="text-sm font-black uppercase tracking-widest">Notifications</SheetTitle>
              <p className="text-[9px] font-medium text-slate-400 mt-0.5">Managed system updates.</p>
            </div>
            {unreadCount > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-[8px] text-primary font-black uppercase h-6 rounded-md hover:bg-primary/5 px-2"
                onClick={() => markAllNotificationsRead()}
              >
                Mark all read
              </Button>
            )}
          </div>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {myNotifications.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-8 h-8 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-2">
                <Bell className="h-4 w-4 text-slate-200" />
              </div>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">All caught up</p>
            </div>
          ) : (
            myNotifications.map(notification => (
              <button
                key={notification.id}
                className={`w-full text-left p-2.5 rounded-lg border transition-all ${
                  notification.read ? 'bg-slate-50/50 border-slate-100' : 'bg-blue-50 border-blue-100 shadow-sm'
                }`}
                onClick={() => handleNotificationClick(notification.id, notification.request_id)}
              >
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded bg-white shadow-sm flex items-center justify-center shrink-0 text-sm">
                      {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1">
                    <p className={`text-[10px] leading-tight ${!notification.read ? 'font-black text-slate-900' : 'font-bold text-slate-600'}`}>
                      {notification.message}
                    </p>
                    <p className="text-[8px] font-black text-slate-400 mt-1 uppercase tracking-widest">
                      {format(parseISO(notification.created_at), 'MMM d, h:mm a')}
                    </p>
                  </div>
                  {!notification.read && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1" />}
                </div>
              </button>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
