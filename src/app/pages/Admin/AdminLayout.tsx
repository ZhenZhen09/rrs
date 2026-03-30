import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { DispatchConsole } from './DispatchConsole';
import { AnalyticsHub } from './AnalyticsHub';
import { UserManagement } from './UserManagement';
import { ThemeSelection } from './ThemeSelection';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { cn } from '../../components/ui/utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../../components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';
import { Truck, Users, BarChart3, LogOut, Bell, UserCog, Mail, Shield, Menu, CheckCheck, Palette, Calendar } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { CalendarView } from './CalendarView';

type AdminView = 'dispatch' | 'users' | 'analytics' | 'theme' | 'calendar';

export function AdminLayout() {
  const { user, logout } = useAuth();
  const { notifications, markNotificationRead, markAllNotificationsRead, requests } = useData();
  const navigate = useNavigate();
  
  const [currentView, setCurrentView] = useState<AdminView>('dispatch');
  const [showProfile, setShowProfile] = useState(false);
  const [isNotificationSheetOpen, setIsNotificationSheetOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

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
      setCurrentView('dispatch'); // Ensure we are on the dispatch view to see the request
      
      setTimeout(() => {
        const element = document.getElementById(`request-${requestId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('ring-4', 'ring-primary/50', 'ring-offset-2', 'transition-all', 'duration-500');
          setTimeout(() => {
            element.classList.remove('ring-4', 'ring-primary/50', 'ring-offset-2');
          }, 2000);
        }
      }, 300);
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
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-white shadow-xl z-20">
        <div className="p-6 flex items-center gap-3 border-b border-slate-800">
          <div className="p-2 bg-primary rounded-xl shadow-lg shadow-primary/20">
            <Truck className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="font-black text-lg leading-none tracking-tight">Rider System</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Administrator</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <p className="px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 mt-2">Main Menu</p>
          
          <button
            onClick={() => setCurrentView('dispatch')}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold transition-all ${currentView === 'dispatch' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <Truck size={18} />
            <span>Dispatch Console</span>
          </button>

          <button
            onClick={() => setCurrentView('calendar')}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold transition-all ${currentView === 'calendar' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <Calendar size={18} />
            <span>Calendar View</span>
          </button>
          
          <button
            onClick={() => setCurrentView('users')}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold transition-all ${currentView === 'users' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <Users size={18} />
            <span>User Management</span>
          </button>

          <button
            onClick={() => setCurrentView('analytics')}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold transition-all ${currentView === 'analytics' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <BarChart3 size={18} />
            <span>Analytics Hub</span>
          </button>

          <p className="px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 mt-6">Settings</p>
          
          <button
            onClick={() => setCurrentView('theme')}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold transition-all ${currentView === 'theme' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <Palette size={18} />
            <span>Theme Selection</span>
          </button>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-800 transition-colors text-left outline-none">
                <div className="w-10 h-10 rounded-xl bg-slate-700 flex items-center justify-center text-white font-black shrink-0">
                  {user?.name?.substring(0, 1).toUpperCase()}
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="text-sm font-bold text-white truncate">{user?.name}</p>
                  <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-2xl border-slate-100 shadow-xl p-2 mb-2">
              <DropdownMenuItem onSelect={() => setShowProfile(true)} className="rounded-xl py-3 cursor-pointer font-bold focus:bg-slate-50">
                <UserCog className="mr-2 h-4 w-4" />
                Profile Info
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-slate-100 my-1" />
              <DropdownMenuItem onSelect={handleLogout} className="rounded-xl py-3 cursor-pointer font-bold text-rose-600 focus:text-rose-700 focus:bg-rose-50">
                <LogOut className="mr-2 h-4 w-4" />
                Secure Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden bg-slate-50">
        
        {/* Header - Hidden in Dispatch view to match premium design */}
        {currentView !== 'dispatch' && (
          <header className="bg-white border-b border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.02)] z-10 shrink-0">
            <div className="flex items-center justify-between px-4 py-3 md:px-8 md:py-4 overflow-hidden">
              
              {/* Mobile Menu Trigger */}
              <div className="md:hidden flex items-center gap-3">
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="md:hidden rounded-xl">
                      <Menu className="h-6 w-6" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-72 bg-slate-900 border-none p-0 flex flex-col">
                    {/* Mobile Sidebar Content */}
                    <div className="p-6 flex items-center gap-3 border-b border-slate-800">
                      <div className="p-2 bg-primary rounded-xl shadow-lg shadow-primary/20">
                        <Truck className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h2 className="font-black text-lg leading-none tracking-tight text-white">Rider System</h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Administrator</p>
                      </div>
                    </div>

                    <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                      <p className="px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 mt-2">Main Menu</p>
                      
                      <SheetTrigger asChild>
                        <button
                          onClick={() => setCurrentView('dispatch')}
                          className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold transition-all ${currentView === 'dispatch' ? 'bg-primary text-white' : 'text-slate-400'}`}
                        >
                          <Truck size={18} />
                          <span>Dispatch Console</span>
                        </button>
                      </SheetTrigger>

                      <SheetTrigger asChild>
                        <button
                          onClick={() => setCurrentView('calendar')}
                          className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold transition-all ${currentView === 'calendar' ? 'bg-primary text-white' : 'text-slate-400'}`}
                        >
                          <Calendar size={18} />
                          <span>Calendar View</span>
                        </button>
                      </SheetTrigger>
                      
                      <SheetTrigger asChild>
                        <button
                          onClick={() => setCurrentView('users')}
                          className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold transition-all ${currentView === 'users' ? 'bg-primary text-white' : 'text-slate-400'}`}
                        >
                          <Users size={18} />
                          <span>User Management</span>
                        </button>
                      </SheetTrigger>

                      <SheetTrigger asChild>
                        <button
                          onClick={() => setCurrentView('analytics')}
                          className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold transition-all ${currentView === 'analytics' ? 'bg-primary text-white' : 'text-slate-400'}`}
                        >
                          <BarChart3 size={18} />
                          <span>Analytics Hub</span>
                        </button>
                      </SheetTrigger>

                      <p className="px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 mt-6">Settings</p>
                      
                      <SheetTrigger asChild>
                        <button
                          onClick={() => setCurrentView('theme')}
                          className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold transition-all ${currentView === 'theme' ? 'bg-primary text-white' : 'text-slate-400'}`}
                        >
                          <Palette size={18} />
                          <span>Theme Selection</span>
                        </button>
                      </SheetTrigger>
                    </nav>
                  </SheetContent>
                </Sheet>
                <h1 className="font-black text-slate-900 text-lg md:hidden">
                  {currentView === 'dispatch' ? 'Dispatch Console' : currentView === 'calendar' ? 'Calendar View' : currentView === 'users' ? 'User Management' : currentView === 'analytics' ? 'Analytics Hub' : 'Theme Selection'}
                </h1>
              </div>

              {/* Desktop Header Title */}
              <div className="hidden md:block">
                <h1 className="text-xl font-black text-slate-900">
                   {currentView === 'calendar' ? 'Task Schedule' : currentView === 'users' ? 'User Accounts' : currentView === 'analytics' ? 'System Analytics' : 'Visual Customization'}
                </h1>
              </div>

              {/* Global Actions (Notifications) */}
              <div className="flex items-center gap-4 ml-auto">
                <Sheet open={isNotificationSheetOpen} onOpenChange={setIsNotificationSheetOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="icon" className="relative rounded-2xl h-12 w-12 border-slate-200 bg-white hover:bg-slate-50 shadow-sm">
                      <Bell className="h-5 w-5 text-slate-600" />
                      {unreadCount > 0 && (
                        <Badge className="absolute -top-1.5 -right-1.5 h-6 w-6 flex items-center justify-center p-0 text-xs bg-rose-500 hover:bg-rose-600 border-2 border-white rounded-full font-black shadow-sm">
                          {unreadCount}
                        </Badge>
                      )}
                    </Button>
                  </SheetTrigger>
                  <SheetContent className="w-full sm:max-w-md rounded-l-[2rem] border-l border-slate-100 shadow-2xl p-0 flex flex-col">
                    <SheetHeader className="p-8 border-b border-slate-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <SheetTitle className="text-2xl font-black text-left">Notifications</SheetTitle>
                          <p className="text-sm font-medium text-slate-500 mt-1">Updates across your managed system.</p>
                        </div>
                        {unreadCount > 0 && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-xs text-primary font-bold h-9 rounded-xl hover:bg-primary/5"
                            onClick={() => markAllNotificationsRead()}
                          >
                            <CheckCheck className="w-4 h-4 mr-1.5" /> Mark all read
                          </Button>
                        )}
                      </div>
                    </SheetHeader>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                      {myNotifications.length === 0 ? (
                        <div className="py-20 text-center">
                          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Bell className="h-8 w-8 text-slate-300" />
                          </div>
                          <p className="text-slate-400 font-bold">You're all caught up!</p>
                        </div>
                      ) : (
                        myNotifications.map(notification => (
                          <button
                            key={notification.id}
                            className={`w-full text-left p-4 rounded-2xl border transition-all ${
                              notification.read ? 'bg-slate-50/50 border-slate-100 hover:bg-slate-50' : 'bg-blue-50 border-blue-100 shadow-sm hover:bg-blue-100/50'
                            }`}
                            onClick={() => handleNotificationClick(notification.id, notification.request_id)}
                          >
                            <div className="flex items-start gap-4">
                              <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center shrink-0 text-lg">
                                 {getNotificationIcon(notification.type)}
                              </div>
                              <div className="flex-1">
                                <p className={`text-sm leading-tight ${!notification.read ? 'font-bold text-slate-900' : 'font-medium text-slate-600'}`}>
                                  {notification.message}
                                </p>
                                <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-widest">
                                  {format(parseISO(notification.created_at), 'MMM d, h:mm a')}
                                </p>
                              </div>
                              {!notification.read && <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5" />}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </SheetContent>
                </Sheet>
                
                {/* Mobile Profile Menu Trigger */}
                <div className="md:hidden">
                   <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center cursor-pointer outline-none">
                        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white font-black shadow-sm">
                          {user?.name?.substring(0, 1).toUpperCase()}
                        </div>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 rounded-2xl border-slate-100 shadow-xl p-2 mt-2">
                      <DropdownMenuLabel>
                        <div>
                          <p className="font-bold text-slate-900">{user?.name}</p>
                          <p className="text-xs font-medium text-slate-500">{user?.email}</p>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator className="bg-slate-50" />
                      <DropdownMenuItem onSelect={() => setShowProfile(true)} className="rounded-xl py-3 font-bold cursor-pointer focus:bg-slate-50">
                        <UserCog className="mr-2 h-4 w-4 text-slate-500" />
                        Profile Info
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={handleLogout} className="rounded-xl py-3 font-bold text-rose-600 cursor-pointer focus:bg-rose-50 focus:text-rose-700">
                        <LogOut className="mr-2 h-4 w-4" />
                        Logout
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          </header>
        )}

        {/* Scrollable View Area */}
        <main className={cn("flex-1 min-h-0", (currentView === 'dispatch' || currentView === 'calendar') ? "overflow-hidden" : "overflow-y-auto")}>
          {currentView === 'dispatch' && <DispatchConsole />}
          
          {currentView === 'calendar' && <CalendarView />}

          {currentView === 'users' && <UserManagement />}

          {currentView === 'analytics' && <AnalyticsHub />}

          {currentView === 'theme' && <ThemeSelection />}
        </main>
      </div>

      {/* Shared Profile Dialog */}
      <Dialog open={showProfile} onOpenChange={setShowProfile}>
        <DialogContent className="rounded-[2.5rem] max-w-md p-10 border-none shadow-2xl">
          <DialogHeader className="mb-8">
            <DialogTitle className="text-3xl font-black text-slate-900 tracking-tight">Admin Profile</DialogTitle>
            <DialogDescription className="text-slate-500 font-medium mt-1">System administrator credentials and access.</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-8">
            <div className="flex items-center gap-5 p-5 bg-slate-50 rounded-[1.5rem] border border-slate-100 shadow-inner">
              <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center text-white text-3xl font-black shadow-lg shadow-primary/30">
                {user?.name?.substring(0, 1).toUpperCase()}
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-900 leading-tight">{user?.name}</h3>
                <Badge variant="outline" className="mt-1 bg-purple-50 text-purple-700 border-purple-200 font-black uppercase text-[10px] tracking-widest">
                  Super Admin
                </Badge>
              </div>
            </div>

            <div className="space-y-5 bg-white p-2">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-50 rounded-2xl">
                  <Mail className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Registered Email</p>
                  <p className="font-bold text-base text-slate-700">{user?.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-50 rounded-2xl">
                  <Shield className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Security Level</p>
                  <p className="font-bold text-base text-slate-700">Full System Access</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-slate-100">
            <Button onClick={() => setShowProfile(false)} className="w-full h-14 rounded-2xl bg-slate-900 hover:bg-black font-black text-white shadow-xl shadow-slate-900/10 transition-all active:scale-[0.98]">
              Close Profile
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}