import React, { useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { 
  Terminal, 
  Clock, 
  Trash2, 
  AlertCircle, 
  Zap, 
  ChevronUp, 
  ChevronDown,
  UserCheck
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../ui/utils';

export const DevSimulator: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // This component only renders in development
  if (process.env.NODE_ENV === 'production' && !window.location.search.includes('dev=true')) {
    return null;
  }

  const runSimulation = async (type: string) => {
    setLoading(true);
    try {
      let res;
      if (type === 'sweep') {
        res = await fetch('/api/users/dev/simulate-sweep', { method: 'POST' });
      } else if (type === 'reset') {
        res = await fetch('/api/users/dev/simulate-reset', { method: 'POST' });
      }
      
      const data = await res?.json();
      if (data?.success) {
        toast.success(
          type === 'sweep' 
            ? `Simulation successful: ${data.riders_processed || 0} riders processed.`
            : `Today's attendance logs have been cleared.`
        );
      } else {
        toast.error(data?.error || "Simulation failed");
      }
    } catch (e) {
      toast.error("Network error during simulation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 left-6 z-[9999]">
      <Card className={cn(
        "bg-slate-900 border-slate-800 shadow-2xl transition-all duration-300 overflow-hidden w-64",
        isOpen ? "h-auto p-4" : "h-12 p-0 flex items-center"
      )}>
        {!isOpen ? (
          <button 
            onClick={() => setIsOpen(true)}
            className="w-full h-full flex items-center justify-between px-4 text-white hover:bg-slate-800 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Terminal size={14} className="text-primary" />
              <span className="text-[10px] font-black uppercase tracking-widest">Dev Simulator</span>
            </div>
            <ChevronUp size={14} />
          </button>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2 text-white">
                <Zap size={14} className="text-primary" />
                <span className="text-[10px] font-black uppercase tracking-widest">Development Tools</span>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-slate-500 hover:text-white">
                <ChevronDown size={14} />
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Shift Controls</p>
              
              <Button 
                variant="outline" 
                size="sm" 
                disabled={loading}
                onClick={() => runSimulation('sweep')}
                className="w-full justify-start gap-2 bg-transparent border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white h-9 rounded-xl text-[9px] font-bold uppercase tracking-tight"
              >
                <Clock size={12} className="text-primary" />
                Trigger 7PM Auto-Sweep
              </Button>

              <Button 
                variant="outline" 
                size="sm" 
                disabled={loading}
                onClick={() => runSimulation('reset')}
                className="w-full justify-start gap-2 bg-transparent border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white h-9 rounded-xl text-[9px] font-bold uppercase tracking-tight"
              >
                <UserCheck size={12} className="text-emerald-500" />
                Reset Morning Shift
              </Button>
            </div>

            <div className="pt-2">
               <div className="p-2 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                  <div className="flex gap-2">
                     <AlertCircle size={12} className="text-rose-500 shrink-0" />
                     <p className="text-[8px] font-bold text-rose-200 leading-tight">
                        Simulator affects all connected Expo Go devices in real-time via Socket.IO.
                     </p>
                  </div>
               </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
