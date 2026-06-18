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
import { Truck, Users, BarChart3, LogOut, Bell, UserCog, Mail, Shield, Menu, CheckCheck, Palette, Calendar, MapPin, ClipboardCheck } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { CalendarView } from './CalendarView';
import { NotificationBell } from '../../components/Admin/NotificationBell';
import { RiderMap } from './RiderMap';
import { AttendanceDashboard } from './AttendanceDashboard';
import { DevSimulator } from '../../components/Admin/DevSimulator';

type AdminView = 'dispatch' | 'users' | 'analytics' | 'theme' | 'calendar' | 'rider-map' | 'attendance';

export function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const [currentView, setCurrentView] = useState<AdminView>('dispatch');
  const [showProfile, setShowProfile] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-56 bg-slate-900 text-white shadow-xl z-20">
        <div className="p-4 flex items-center gap-2.5 border-b border-slate-800">
          <div className="p-1.5 bg-primary rounded-lg">
            <Truck className="h-4.5 w-4.5 text-white" />
          </div>
          <div>
            <h2 className="font-black text-sm leading-none tracking-tight text-white uppercase italic">
              CFA <span className="text-[#f3bc2c]">RSS</span>
            </h2>
            <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Administrator</p>
          </div>
        </div>

        <nav className="flex-1 p-2.5 space-y-1 overflow-y-auto">
          <p className="px-3 text-[8px] font-black text-slate-600 uppercase tracking-widest mb-2 mt-1">Main Menu</p>
          
          <button
            onClick={() => setCurrentView('dispatch')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-bold transition-all ${currentView === 'dispatch' ? 'bg-primary text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <Truck size={14} />
            <span className="text-[11px]">Dispatch Console</span>
          </button>

          <button
            onClick={() => setCurrentView('calendar')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-bold transition-all ${currentView === 'calendar' ? 'bg-primary text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <Calendar size={14} />
            <span className="text-[11px]">Calendar View</span>
          </button>
          
          <button
            onClick={() => setCurrentView('users')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-bold transition-all ${currentView === 'users' ? 'bg-primary text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <Users size={14} />
            <span className="text-[11px]">User Management</span>
          </button>

          <button
            onClick={() => setCurrentView('analytics')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-bold transition-all ${currentView === 'analytics' ? 'bg-primary text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <BarChart3 size={14} />
            <span className="text-[11px]">Analytics Hub</span>
          </button>

          <button
            onClick={() => setCurrentView('rider-map')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-bold transition-all ${currentView === 'rider-map' ? 'bg-primary text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <MapPin size={14} />
            <span className="text-[11px]">Rider Map</span>
          </button>

          <button
            onClick={() => setCurrentView('attendance')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-bold transition-all ${currentView === 'attendance' ? 'bg-primary text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <ClipboardCheck size={14} />
            <span className="text-[11px]">Attendance</span>
          </button>

          <p className="px-3 text-[8px] font-black text-slate-600 uppercase tracking-widest mb-2 mt-4">Settings</p>
          
          <button
            onClick={() => setCurrentView('theme')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-bold transition-all ${currentView === 'theme' ? 'bg-primary text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <Palette size={14} />
            <span className="text-[11px]">Theme Selection</span>
          </button>
        </nav>

        <div className="p-2.5 border-t border-slate-800">
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
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden bg-slate-50">
        
        {/* Header - Hidden in Dispatch view to match premium design */}
        {currentView !== 'dispatch' && currentView !== 'rider-map' && (
          <header className="bg-white border-b border-slate-100 shadow-sm z-10 shrink-0">
            <div className="flex items-center justify-between px-3 py-1 md:px-5 md:py-1 overflow-hidden">
              
              {/* Mobile Menu Trigger */}
              <div className="md:hidden flex items-center gap-1.5">
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="md:hidden rounded h-7 w-7">
                      <Menu className="h-4 w-4" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-56 bg-slate-900 border-none p-0 flex flex-col">
                    {/* Mobile Sidebar Content */}
                    <div className="p-3 flex items-center gap-2 border-b border-slate-800">
                      <div className="p-1 bg-primary rounded shadow-lg shadow-primary/20">
                        <Truck className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <h2 className="font-black text-xs leading-none tracking-tight text-white">Go<span className="text-amber-500">Finance</span></h2>
                        <p className="text-[7px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Administrator</p>
                      </div>
                    </div>

                    <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
                      <p className="px-2 text-[7px] font-black text-slate-500 uppercase tracking-widest mb-2 mt-1">Main Menu</p>
                      
                      <SheetTrigger asChild>
                        <button
                          onClick={() => setCurrentView('dispatch')}
                          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg font-bold transition-all ${currentView === 'dispatch' ? 'bg-primary text-white' : 'text-slate-400'}`}
                        >
                          <Truck size={14} />
                          <span className="text-xs">Dispatch Console</span>
                        </button>
                      </SheetTrigger>

                      <SheetTrigger asChild>
                        <button
                          onClick={() => setCurrentView('calendar')}
                          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg font-bold transition-all ${currentView === 'calendar' ? 'bg-primary text-white' : 'text-slate-400'}`}
                        >
                          <Calendar size={14} />
                          <span className="text-xs">Calendar View</span>
                        </button>
                      </SheetTrigger>
                      
                      <SheetTrigger asChild>
                        <button
                          onClick={() => setCurrentView('users')}
                          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg font-bold transition-all ${currentView === 'users' ? 'bg-primary text-white' : 'text-slate-400'}`}
                        >
                          <Users size={14} />
                          <span className="text-xs">User Management</span>
                        </button>
                      </SheetTrigger>

                      <SheetTrigger asChild>
                        <button
                          onClick={() => setCurrentView('analytics')}
                          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg font-bold transition-all ${currentView === 'analytics' ? 'bg-primary text-white' : 'text-slate-400'}`}
                        >
                          <BarChart3 size={14} />
                          <span className="text-xs">Analytics Hub</span>
                        </button>
                      </SheetTrigger>

                      <SheetTrigger asChild>
                        <button
                          onClick={() => setCurrentView('rider-map')}
                          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg font-bold transition-all ${currentView === 'rider-map' ? 'bg-primary text-white' : 'text-slate-400'}`}
                        >
                          <MapPin size={14} />
                          <span className="text-xs">Rider Map</span>
                        </button>
                      </SheetTrigger>

                      <SheetTrigger asChild>
                        <button
                          onClick={() => setCurrentView('attendance')}
                          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg font-bold transition-all ${currentView === 'attendance' ? 'bg-primary text-white' : 'text-slate-400'}`}
                        >
                          <ClipboardCheck size={14} />
                          <span className="text-xs">Attendance</span>
                        </button>
                      </SheetTrigger>

                      <p className="px-2 text-[7px] font-black text-slate-500 uppercase tracking-widest mb-2 mt-4">Settings</p>
                      
                      <SheetTrigger asChild>
                        <button
                          onClick={() => setCurrentView('theme')}
                          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg font-bold transition-all ${currentView === 'theme' ? 'bg-primary text-white' : 'text-slate-400'}`}
                        >
                          <Palette size={14} />
                          <span className="text-xs">Theme Selection</span>
                        </button>
                      </SheetTrigger>
                    </nav>
                  </SheetContent>
                </Sheet>
                <h1 className="font-black text-slate-900 text-xs md:hidden uppercase tracking-widest">
                  {currentView}
                </h1>
              </div>

              {/* Desktop Header Title */}
              <div className="hidden md:block">
                <h1 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                   System / <span className="text-slate-900">{currentView === 'calendar' ? 'Task Schedule' : currentView === 'users' ? 'User Accounts' : currentView === 'analytics' ? 'Analytics' : currentView === 'attendance' ? 'Rider Attendance' : 'Themes'}</span>
                </h1>
              </div>

              {/* Global Actions (Notifications) */}
              <div className="flex items-center gap-2 ml-auto">
                <NotificationBell />
                
                {/* Mobile Profile Menu Trigger */}
                <div className="md:hidden">
                   <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center cursor-pointer outline-none">
                        <div className="w-6 h-6 rounded bg-primary flex items-center justify-center text-white font-black shadow-sm text-[8px]">
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
        )}

        {/* Scrollable View Area */}
        <main className={cn("flex-1 min-h-0", (currentView === 'dispatch' || currentView === 'calendar' || currentView === 'rider-map' || currentView === 'attendance') ? "overflow-hidden" : "overflow-y-auto")}>
          {currentView === 'dispatch' && <DispatchConsole />}
          
          {currentView === 'calendar' && <CalendarView />}

          {currentView === 'users' && <UserManagement />}

          {currentView === 'analytics' && <AnalyticsHub />}

          {currentView === 'theme' && <ThemeSelection />}

          {currentView === 'rider-map' && <RiderMap />}

          {currentView === 'attendance' && <AttendanceDashboard />}
        </main>
      </div>

      <DevSimulator />

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
