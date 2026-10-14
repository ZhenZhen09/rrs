import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { WebPushSettings } from '../../components/WebPushSettings';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { cn } from '../../components/ui/utils';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '../../components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';
import { Truck, Users, BarChart3, LogOut, UserCog, Mail, Shield, Menu, Palette, Calendar, MapPin, ClipboardCheck, Loader2, MessageSquare } from 'lucide-react';
import { NotificationBell } from '../../components/Admin/NotificationBell';
import { FloatingRiderMessagePreview } from '../../components/Admin/FloatingRiderMessagePreview';
import { useRealTime } from '../../context/RealTimeContext';
import './admin-performance.css';

// Keep heavyweight admin views out of the initial shell bundle. Maps, charts,
// and dispatch interactions are loaded only when the user opens that view.
const DispatchConsole = lazy(() => import('./DispatchConsole').then(module => ({ default: module.DispatchConsole })));
const AnalyticsHub = lazy(() => import('./AnalyticsHub').then(module => ({ default: module.AnalyticsHub })));
const UserManagement = lazy(() => import('./UserManagement').then(module => ({ default: module.UserManagement })));
const ThemeSelection = lazy(() => import('./ThemeSelection').then(module => ({ default: module.ThemeSelection })));
const CalendarView = lazy(() => import('./CalendarView').then(module => ({ default: module.CalendarView })));
const RiderMap = lazy(() => import('./RiderMap').then(module => ({ default: module.RiderMap })));
const AttendanceDashboard = lazy(() => import('./AttendanceDashboard').then(module => ({ default: module.AttendanceDashboard })));
const AdminMessaging = lazy(() => import('./AdminMessaging').then(module => ({ default: module.AdminMessaging })));

type AdminView = 'dispatch' | 'messages' | 'users' | 'analytics' | 'theme' | 'calendar' | 'rider-map' | 'attendance';

const ADMIN_MAIN_NAVIGATION = [
  { view: 'dispatch', label: 'Dispatch Console', icon: Truck },
  { view: 'calendar', label: 'Calendar View', icon: Calendar },
  { view: 'rider-map', label: 'Rider Map', icon: MapPin },
  { view: 'messages', label: 'Inbox', icon: MessageSquare },
  { view: 'attendance', label: 'Attendance', icon: ClipboardCheck },
  { view: 'analytics', label: 'Analytics Hub', icon: BarChart3 },
  { view: 'users', label: 'User Management', icon: Users },
] as const;

export function AdminLayout() {
  const { user, logout } = useAuth();
  const { socket } = useRealTime();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const openRequestId = searchParams.get('request');
  
  const [currentView, setCurrentView] = useState<AdminView>('dispatch');
  const [pendingConversationId, setPendingConversationId] = useState<string | null>(null);
  const [pendingRequestId, setPendingRequestId] = useState<string | null>(null);
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    if (openRequestId) setCurrentView('dispatch');
  }, [openRequestId]);

  useEffect(() => {
    if (currentView !== 'messages') setPendingConversationId(null);
  }, [currentView]);

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  const openRiderConversation = (conversationId: string) => {
    setPendingConversationId(conversationId);
    setCurrentView('messages');
  };

  const openAdminRequest = useCallback((requestId: string) => {
    setPendingRequestId(requestId);
    setCurrentView('dispatch');
    setSearchParams(current => {
      const next = new URLSearchParams(current);
      next.delete('request');
      return next;
    }, { replace: true });
  }, [setSearchParams]);
  const clearPendingRequest = useCallback((requestId: string) => {
    setPendingRequestId(current => current === requestId ? null : current);
  }, []);

  return (
    <div className="admin-pwa-shell flex h-[100dvh] min-h-[100dvh] w-full overscroll-none bg-slate-50 overflow-hidden">
      {/* Sidebar - Desktop */}
      <aside className="hidden w-56 shrink-0 flex-col bg-slate-900 text-white shadow-xl z-20 md:flex">
        <div className="p-4 pt-[calc(1rem+env(safe-area-inset-top))] flex items-center gap-2.5 border-b border-slate-800">
          <div className="p-1.5 bg-primary rounded-lg">
            <Truck className="h-4.5 w-4.5 text-white" />
          </div>
          <div>
            <h2 className="font-black text-sm leading-none tracking-tight text-white uppercase italic">
              ERRANDS
            </h2>
            <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Administrator</p>
          </div>
        </div>

        <nav className="flex-1 p-2.5 space-y-1 overflow-y-auto">
          <p className="px-3 text-[8px] font-black text-slate-600 uppercase tracking-widest mb-2 mt-1">Main Menu</p>
          
          {ADMIN_MAIN_NAVIGATION.map(({ view, label, icon: Icon }) => (
            <button
              key={view}
              onClick={() => setCurrentView(view)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-bold transition-all ${currentView === view ? 'bg-primary text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
            >
              <Icon size={14} />
              <span className="text-[11px]">{label}</span>
            </button>
          ))}

          <p className="px-3 text-[8px] font-black text-slate-600 uppercase tracking-widest mb-2 mt-4">Settings</p>
          
          <button
            onClick={() => setCurrentView('theme')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-bold transition-all ${currentView === 'theme' ? 'bg-primary text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <Palette size={14} />
            <span className="text-[11px]">Theme Selection</span>
          </button>
        </nav>

        <div className="p-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))] border-t border-slate-800">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-800 transition-colors text-left outline-none">
                <div className="w-8 h-8 rounded bg-slate-700 flex items-center justify-center text-white font-black shrink-0 text-xs">
                  {user?.name?.substring(0, 1).toUpperCase()}
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="text-[11px] font-bold text-white truncate">{user?.name}</p>
                  <p className="text-[9px] text-slate-500 truncate">{user?.email}</p>
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
      <div className="flex min-w-0 min-h-0 h-[100dvh] flex-1 flex-col overflow-hidden bg-slate-50">
        
        {/* The full-screen Dispatch and Rider Map views keep this header mobile-only. */}
          <header className={cn("shrink-0 border-b border-slate-100 bg-white shadow-sm z-10 pt-[env(safe-area-inset-top)]", (currentView === 'dispatch' || currentView === 'rider-map') && "md:hidden")}>
            <div className="flex min-h-14 items-center justify-between gap-2 overflow-hidden px-3 py-2 md:min-h-12 md:px-5 md:py-1">
              
              {/* Mobile Menu Trigger */}
              <div className="md:hidden flex items-center gap-1.5">
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label="Open admin navigation" className="md:hidden h-10 w-10 rounded-xl">
                      <Menu className="h-4 w-4" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="h-[100dvh] w-[min(19rem,calc(100vw-1rem))] max-h-[100dvh] border-none bg-slate-900 p-0 pb-[env(safe-area-inset-bottom)] flex flex-col data-[state=open]:!duration-200 data-[state=closed]:!duration-150">
                    <SheetHeader className="sr-only">
                      <SheetTitle>Admin navigation</SheetTitle>
                      <SheetDescription>Choose an area of the administration workspace.</SheetDescription>
                    </SheetHeader>
                    {/* Mobile Sidebar Content */}
                    <div className="p-4 pt-[calc(1rem+env(safe-area-inset-top))] flex items-center gap-2 border-b border-slate-800">
                      <div className="p-1 bg-primary rounded shadow-lg shadow-primary/20">
                        <Truck className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <h2 className="font-black text-xs leading-none tracking-tight text-white uppercase italic">ERRANDS</h2>
                        <p className="text-[7px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Administrator</p>
                      </div>
                    </div>

                    <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
                      <p className="px-2 text-[7px] font-black text-slate-500 uppercase tracking-widest mb-2 mt-1">Main Menu</p>
                      
                      {ADMIN_MAIN_NAVIGATION.map(({ view, label, icon: Icon }) => (
                        <SheetTrigger asChild key={view}>
                          <button
                            onClick={() => setCurrentView(view)}
                            className={`min-h-11 w-full flex items-center gap-3 px-3 py-2 rounded-xl font-bold transition-all ${currentView === view ? 'bg-primary text-white' : 'text-slate-400'}`}
                          >
                            <Icon size={14} />
                            <span className="text-xs">{label}</span>
                          </button>
                        </SheetTrigger>
                      ))}

                      <p className="px-2 text-[7px] font-black text-slate-500 uppercase tracking-widest mb-2 mt-4">Settings</p>
                      
                      <SheetTrigger asChild>
                        <button
                          onClick={() => setCurrentView('theme')}
                          className={`min-h-11 w-full flex items-center gap-3 px-3 py-2 rounded-xl font-bold transition-all ${currentView === 'theme' ? 'bg-primary text-white' : 'text-slate-400'}`}
                        >
                          <Palette size={14} />
                          <span className="text-xs">Theme Selection</span>
                        </button>
                      </SheetTrigger>
                    </nav>
                  </SheetContent>
                </Sheet>
                <h1 className="min-w-0 truncate font-black text-slate-900 text-xs md:hidden uppercase tracking-widest">
                  {currentView === 'rider-map' ? 'Rider Map' : currentView === 'calendar' ? 'Calendar View' : currentView === 'messages' ? 'Inbox' : currentView === 'users' ? 'User Management' : currentView === 'analytics' ? 'Analytics Hub' : currentView === 'attendance' ? 'Attendance' : currentView === 'theme' ? 'Theme Selection' : 'Dispatch Console'}
                </h1>
              </div>

              {/* Desktop Header Title */}
              <div className="hidden md:block">
                <h1 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                   System / <span className="text-slate-900">{currentView === 'calendar' ? 'Task Schedule' : currentView === 'messages' ? 'Inbox' : currentView === 'users' ? 'User Accounts' : currentView === 'analytics' ? 'Analytics' : currentView === 'attendance' ? 'Rider Attendance' : 'Themes'}</span>
                </h1>
              </div>

              {/* Global Actions (Notifications) */}
              <div className="flex items-center gap-2 ml-auto">
                <NotificationBell onOpenRequest={openAdminRequest} />
                
                {/* Mobile Profile Menu Trigger */}
                <div className="md:hidden">
                   <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button aria-label="Open admin profile menu" className="flex min-h-10 min-w-10 items-center justify-center cursor-pointer rounded-xl outline-none">
                        <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center text-white font-black shadow-sm text-[8px]">
                          {user?.name?.substring(0, 1).toUpperCase()}
                        </div>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40 rounded-md border-slate-100 shadow-xl p-1 mt-1">
                      <DropdownMenuLabel className="py-1 px-1.5">
                        <div>
                          <p className="font-bold text-slate-900 text-[10px]">{user?.name}</p>
                          <p className="text-[8px] font-medium text-slate-500">{user?.email}</p>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator className="bg-slate-50" />
                      <DropdownMenuItem onSelect={() => setShowProfile(true)} className="rounded py-1.5 font-bold cursor-pointer focus:bg-slate-50 text-[9px]">
                        <UserCog className="mr-1.5 h-3 w-3 text-slate-500" />
                        Profile
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={handleLogout} className="rounded py-1.5 font-bold text-rose-600 cursor-pointer focus:bg-rose-50 text-[9px]">
                        <LogOut className="mr-1.5 h-3 w-3" />
                        Logout
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          </header>

        {/* Scrollable View Area */}
        <main className={cn("min-h-0 min-w-0 flex-1 overscroll-contain pb-[env(safe-area-inset-bottom)]", (currentView === 'dispatch' || currentView === 'calendar' || currentView === 'messages' || currentView === 'rider-map' || currentView === 'attendance') ? "overflow-hidden" : "overflow-y-auto") }>
          <Suspense fallback={
            <div className="flex min-h-full items-center justify-center p-6 text-slate-500" role="status" aria-live="polite">
              <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
              <span className="sr-only">Loading admin view</span>
            </div>
          }>
            {currentView === 'dispatch' && <DispatchConsole openRequestId={pendingRequestId || openRequestId || undefined} onOpenRequest={openAdminRequest} onRequestOpened={clearPendingRequest} />}
            {currentView === 'calendar' && <CalendarView />}
            {currentView === 'users' && <UserManagement />}
            {currentView === 'analytics' && <AnalyticsHub />}
            {currentView === 'theme' && <ThemeSelection />}
            {currentView === 'rider-map' && <RiderMap />}
            {currentView === 'attendance' && <AttendanceDashboard />}
            {currentView === 'messages' && <AdminMessaging
              initialConversationId={pendingConversationId}
              onInitialConversationOpened={() => setPendingConversationId(null)}
            />}
          </Suspense>
        </main>
      </div>

      <FloatingRiderMessagePreview
        socket={socket}
        actorId={user?.id || ''}
        inboxActive={currentView === 'messages'}
        onOpenConversation={openRiderConversation}
      />


      {/* Shared Profile Dialog */}
      <Dialog open={showProfile} onOpenChange={setShowProfile}>
        <DialogContent className="w-[calc(100%-1rem)] max-h-[90dvh] overflow-y-auto rounded-2xl max-w-md p-5 sm:rounded-[2.5rem] sm:p-10 border-none shadow-2xl">
          <DialogHeader className="mb-4 sm:mb-8">
            <DialogTitle className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Admin Profile</DialogTitle>
            <DialogDescription className="text-slate-500 font-medium mt-1">System administrator credentials and access.</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-5 sm:space-y-8">
            <div className="flex items-center gap-3 sm:gap-5 p-4 sm:p-5 bg-slate-50 rounded-2xl sm:rounded-[1.5rem] border border-slate-100 shadow-inner">
              <div className="w-14 h-14 sm:w-20 sm:h-20 bg-primary rounded-full flex items-center justify-center text-white text-2xl sm:text-3xl font-black shadow-lg shadow-primary/30">
                {user?.name?.substring(0, 1).toUpperCase()}
              </div>
              <div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight break-words">{user?.name}</h3>
                <Badge variant="outline" className="mt-1 bg-purple-50 text-purple-700 border-purple-200 font-black uppercase text-[10px] tracking-widest">
                  Super Admin
                </Badge>
              </div>
            </div>

            <div className="space-y-4 sm:space-y-5 bg-white p-0 sm:p-2">
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

          <AdminWebPushSettings />

          <div className="mt-6 sm:mt-10 pt-4 sm:pt-6 border-t border-slate-100">
            <Button onClick={() => setShowProfile(false)} className="w-full h-12 sm:h-14 rounded-2xl bg-slate-900 hover:bg-black font-black text-white shadow-xl shadow-slate-900/10 transition-all active:scale-[0.98]">
              Close Profile
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AdminWebPushSettings() {
  const { fetchWithAuth } = useData();
  return <WebPushSettings fetchWithAuth={fetchWithAuth} />;
}
