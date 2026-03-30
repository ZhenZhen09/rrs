import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '../components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { Truck, LogOut, Bell, UserCog, Mail, Shield, Building, CheckCheck } from 'lucide-react';
import { PersonnelDashboard } from './PersonnelDashboard';
import { AdminLayout } from './Admin/AdminLayout';
import { RiderDashboard } from './RiderDashboard';
import { QuickStartGuide } from '../components/QuickStartGuide';
import { format, parseISO } from 'date-fns';

export function Dashboard() {
  const { user, logout } = useAuth();
  const { notifications, markNotificationRead, markAllNotificationsRead, requests } = useData();
  const navigate = useNavigate();
  const location = useLocation();
  const [showProfile, setShowProfile] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // Redirect to role-specific dashboard if on generic /dashboard
  useEffect(() => {
    if (user && location.pathname === '/dashboard') {
      navigate(`/${user.role}/dashboard`, { replace: true });
    }
  }, [user, location.pathname, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  // Filter notifications for current user and exclude those linked to completed/failed transactions or disapproved requests
  // Then limit to 50 for UI performance to prevent flooding
  const myNotifications = (Array.isArray(notifications) ? notifications : []).filter(n => {
    if (n.user_id !== user?.id) return false;
    
    if (n.request_id && Array.isArray(requests)) {
      const request = requests.find(r => r.request_id === n.request_id);
      if (request && (
        request.delivery_status === 'completed' || 
        request.delivery_status === 'failed' ||
        request.status === 'disapproved' ||
        request.status === 'submitted_waiting'
      )) {
        return false;
      }
    }
    return true;
  }).slice(0, 50);

  const unreadCount = myNotifications.filter(n => !n.read).length;

  const handleNotificationClick = (notificationId: string, requestId?: string) => {
    markNotificationRead(notificationId);
    
    if (requestId) {
      setIsSheetOpen(false); // Close the notification sheet
      setTimeout(() => {
        const element = document.getElementById(`request-${requestId}`);
        if (element) {
          // Scroll into view
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          
          // Add a temporary highlight effect
          element.classList.add('ring-4', 'ring-primary/50', 'ring-offset-2', 'transition-all', 'duration-500');
          setTimeout(() => {
            element.classList.remove('ring-4', 'ring-primary/50', 'ring-offset-2');
          }, 2000);
        }
      }, 300);
    }
  };

  const getRoleName = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Administrator';
      case 'personnel':
        return 'Department Personnel';
      case 'rider':
        return 'Rider';
      default:
        return role;
    }
  };

  const getNotificationIcon = (type: string) => {
    // Return different emojis based on notification type
    switch (type) {
      case 'request_submitted':
        return '📝';
      case 'request_approved':
        return '✅';
      case 'request_disapproved':
        return '❌';
      case 'rider_assigned':
        return '🚚';
      case 'delivery_reminder':
        return '⏰';
      default:
        return '🔔';
    }
  };

  // The Admin Layout now handles its own header and sidebar to provide a true app-like experience
  if (user?.role === 'admin') {
     return <AdminLayout />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <QuickStartGuide />

      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary rounded-lg">
                <Truck className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h2 className="font-semibold">Rider Scheduling System</h2>
                <p className="text-sm text-muted-foreground">{getRoleName(user?.role || '')}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Notifications */}
              <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <Badge
                        variant="destructive"
                        className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
                      >
                        {unreadCount}
                      </Badge>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <div className="flex items-center justify-between">
                      <SheetTitle>Notifications</SheetTitle>
                      {unreadCount > 0 && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-xs text-primary h-8"
                          onClick={() => markAllNotificationsRead()}
                        >
                          <CheckCheck className="w-4 h-4 mr-1" /> Mark all read
                        </Button>
                      )}
                    </div>
                  </SheetHeader>
                  <div className="mt-6 space-y-3">
                    {myNotifications.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">No notifications</p>
                    ) : (
                      myNotifications.map(notification => (
                        <div
                          key={notification.id}
                          className={`p-3 rounded-lg border cursor-pointer transition-colors hover:bg-slate-50 ${
                            notification.read ? 'bg-muted/50' : 'bg-blue-50 border-blue-200'
                          }`}
                          onClick={() => handleNotificationClick(notification.id, notification.request_id)}
                        >
                          <div className="flex items-start gap-3">
                            <span className="text-2xl">{getNotificationIcon(notification.type)}</span>
                            <div className="flex-1">
                              <p className={`text-sm ${!notification.read ? 'font-medium' : ''}`}>
                                {notification.message}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {format(parseISO(notification.created_at), 'PPp')}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </SheetContent>
              </Sheet>

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button type="button" className="flex items-center cursor-pointer ml-2 outline-none">
                    <div className="w-9 h-9 rounded-full border-2 border-gray-300 bg-primary flex items-center justify-center text-white font-bold shrink-0">
                      {user?.name?.substring(0, 1).toUpperCase()}
                    </div>
                    <div className="ml-3 text-left hidden sm:block">
                      <p className="text-sm font-bold text-gray-800 leading-none">{user?.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{user?.email}</p>
                    </div>
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3 fill-gray-400 ml-3 hidden sm:block" viewBox="0 0 330 330">
                      <path d="M325.607 79.393c-5.857-5.857-15.355-5.858-21.213.001l-139.39 139.393L25.607 79.393c-5.857-5.857-15.355-5.858-21.213.001-5.858 5.858-5.858 15.355 0 21.213l150 150a14.999 14.999 0 0 0 21.213 0l150-150c5.859-5.857 5.859-15.355-.001-21.213z" />
                    </svg>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 mt-2">
                  <DropdownMenuLabel>
                    <div>
                      <p className="font-medium">{user?.name}</p>
                      <p className="text-xs text-muted-foreground">{user?.email}</p>
                      {user?.department && (
                        <p className="text-xs text-muted-foreground">{user.department}</p>
                      )}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => setShowProfile(true)}>
                    <UserCog className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={handleLogout} className="text-red-600 focus:text-red-600 focus:bg-red-50">
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {user?.role === 'personnel' && <PersonnelDashboard />}
        {user?.role === 'rider' && <RiderDashboard />}
      </main>

      {/* Profile Dialog */}
      <Dialog open={showProfile} onOpenChange={setShowProfile}>
        <DialogContent className="rounded-[2rem] max-w-md p-8 border-none shadow-2xl">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-2xl font-black text-slate-900">User Profile</DialogTitle>
            <DialogDescription className="text-slate-500 font-medium">Your account information and role permissions.</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-primary/20">
                {user?.name?.substring(0, 1).toUpperCase()}
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">{user?.name}</h3>
                <p className="text-sm font-medium text-slate-500 capitalize">{user?.role} Account</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Mail className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Email Address</p>
                  <p className="font-bold text-sm text-slate-700">{user?.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-50 rounded-lg">
                  <Shield className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Access Role</p>
                  <p className="font-bold text-sm text-slate-700 capitalize">{user?.role}</p>
                </div>
              </div>

              {user?.department && (
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-50 rounded-lg">
                    <Building className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Department</p>
                    <p className="font-bold text-sm text-slate-700">{user.department}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100">
            <Button onClick={() => setShowProfile(false)} className="w-full h-12 rounded-xl bg-slate-900 hover:bg-slate-800 font-bold text-white">
              Close Profile
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}