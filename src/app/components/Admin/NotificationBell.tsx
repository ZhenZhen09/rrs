import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '../ui/sheet';
import { Bell } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import './notification-bell.css';

export function NotificationBell({ onOpenRequest }: { onOpenRequest?: (requestId: string) => void }) {
  const { user } = useAuth();
  const { notifications, markNotificationRead, markAllNotificationsRead } = useData();
  const { requests } = useData();
  const [isNotificationSheetOpen, setIsNotificationSheetOpen] = useState(false);
  const [unavailableRequestId, setUnavailableRequestId] = useState<string | null>(null);

  // Keep completed and failed notifications in the inbox as readable history.
  const myNotifications = (Array.isArray(notifications) ? notifications : []).filter(n => {
    return n.user_id === user?.id;
  }).slice(0, 50);

  const unreadCount = myNotifications.filter(n => !n.read).length;

  const handleNotificationClick = (notificationId: string, requestId?: string) => {
    if (requestId) {
      const requestExists = requests.some((request) => request.request_id === requestId);
      if (!requestExists || !onOpenRequest) {
        setUnavailableRequestId(requestId);
        return;
      }
      onOpenRequest(requestId);
      markNotificationRead(notificationId);
      setIsNotificationSheetOpen(false);
      setUnavailableRequestId(null);
      return;
    }

    markNotificationRead(notificationId);
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
        <Button
          variant="outline"
          size="icon"
          aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
          onClick={() => setUnavailableRequestId(null)}
          className="relative h-10 w-10 rounded-xl border-slate-200 bg-white transition-all hover:bg-slate-50"
        >
          <Bell className="h-4 w-4 text-slate-500" aria-hidden="true" />
          {unreadCount > 0 && (
            <Badge aria-hidden="true" className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full border-white bg-rose-500 p-0 text-[9px] font-black shadow-sm">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="admin-notification-sheet inset-x-0 top-auto bottom-0 h-[min(72dvh,36rem)] max-h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom))] w-full max-w-none rounded-t-2xl border-l-0 border-t border-slate-100 pb-[env(safe-area-inset-bottom)] shadow-2xl p-0 flex flex-col max-md:data-[state=open]:!duration-200 max-md:data-[state=closed]:!duration-150 max-md:data-[state=open]:!slide-in-from-bottom max-md:data-[state=closed]:!slide-out-to-bottom md:inset-y-0 md:top-0 md:right-0 md:left-auto md:bottom-0 md:h-full md:max-h-none md:w-full md:max-w-xs md:rounded-none md:border-t-0 md:border-l md:pb-0 md:data-[state=open]:slide-in-from-right md:data-[state=closed]:slide-out-to-right">
        <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-slate-200 md:hidden" aria-hidden="true" />
        <SheetHeader className="p-3 md:p-4 border-b border-slate-50 text-left">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="text-sm font-black uppercase tracking-widest">Notifications</SheetTitle>
              <SheetDescription className="mt-0.5 text-[9px] font-medium text-slate-400">Managed system updates.</SheetDescription>
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
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2 space-y-2">
          {unavailableRequestId && (
            <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800">
              Request {unavailableRequestId} is not available in the current Admin data. This notification remains unread.
            </p>
          )}
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
                    {notification.request_id && requests.some((request) => request.request_id === notification.request_id && ['completed', 'delivered', 'failed', 'cancelled'].includes(String(request.delivery_status || '').toLowerCase())) && <p className="mt-1 text-[8px] font-black uppercase tracking-widest text-slate-400">Resolved</p>}
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
