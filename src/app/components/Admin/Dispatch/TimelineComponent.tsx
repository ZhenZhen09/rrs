import React from 'react';
import { Clock, MapPin, Power, Activity, ShieldAlert, WifiOff } from 'lucide-react';
import { cn } from '../../ui/utils';

interface MovementEvent {
  id: string;
  event_type: 'duty_on' | 'duty_off' | 'arrived_pickup' | 'left_pickup' | 'arrived_dropoff' | 'idle_alert' | 'signal_lost';
  message: string;
  metadata: any;
  timestamp: string;
}

interface TimelineComponentProps {
  events: MovementEvent[];
}

export const TimelineComponent: React.FC<TimelineComponentProps> = ({ events }) => {
  const getEventConfig = (type: MovementEvent['event_type']) => {
    switch (type) {
      case 'duty_on':
        return { icon: <Power size={12} />, color: 'bg-emerald-500', text: 'text-emerald-600' };
      case 'duty_off':
        return { icon: <Power size={12} />, color: 'bg-slate-400', text: 'text-slate-600' };
      case 'arrived_pickup':
      case 'arrived_dropoff':
        return { icon: <MapPin size={12} />, color: 'bg-blue-500', text: 'text-blue-600' };
      case 'idle_alert':
        return { icon: <Activity size={12} />, color: 'bg-amber-500', text: 'text-amber-600' };
      case 'signal_lost':
        return { icon: <WifiOff size={12} />, color: 'bg-rose-500', text: 'text-rose-600' };
      default:
        return { icon: <Clock size={12} />, color: 'bg-slate-500', text: 'text-slate-600' };
    }
  };

  if (events.length === 0) {
    return (
      <div className="py-8 text-center border-2 border-dashed border-slate-100 rounded-2xl">
        <Clock size={24} className="mx-auto text-slate-300 mb-2" />
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No movement logs yet</p>
      </div>
    );
  }

  return (
    <div className="relative pl-6 space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-100">
      {events.map((event, idx) => {
        const config = getEventConfig(event.event_type);
        const time = new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const meta = typeof event.metadata === 'string' ? JSON.parse(event.metadata) : event.metadata;

        return (
          <div key={event.id} className="relative animate-in fade-in slide-in-from-left-2 duration-300" style={{ animationDelay: `${idx * 50}ms` }}>
            <div className={cn(
              "absolute -left-[23px] top-1 w-6 h-6 rounded-full border-4 border-white shadow-sm flex items-center justify-center text-white",
              config.color
            )}>
              {config.icon}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[9px] font-black text-slate-900">{time}</span>
                <span className={cn("text-[9px] font-black uppercase tracking-tight", config.text)}>
                  {event.event_type.replace('_', ' ')}
                </span>
              </div>
              <p className="text-[11px] font-bold text-slate-600 leading-tight">
                {event.message}
              </p>
              {meta && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {Object.entries(meta).map(([key, val]: [string, any]) => (
                    <span key={key} className="text-[8px] bg-slate-50 text-slate-500 px-1.5 py-0.5 rounded border border-slate-100 font-bold uppercase tracking-tighter">
                      {key}: {val}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
