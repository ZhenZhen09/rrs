import React, { useMemo } from 'react';
import { RequestCard } from './RequestCard';
import { DeliveryRequest } from '../../../types';
import { ScrollArea } from '../../ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Package, Calendar, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  isTerminalRequest, 
  isActiveRequest, 
  isPendingRequest 
} from "../../../utils/statusMapping";
import { format, parseISO } from 'date-fns';
import { cn } from '../../ui/utils';

interface RequestListProps {
  requests: DeliveryRequest[];
  filteredRequests?: DeliveryRequest[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  filter?: string;
  onFilterChange?: (filter: string) => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
  selectedIds?: string[];
  onToggleSelect?: (id: string) => void;
  onSelectAll?: () => void; counts?: { pending: number; active: number; done: number };
}

const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const RequestList: React.FC<RequestListProps> = ({ 
  requests = [],
  filteredRequests,
  selectedId, 
  onSelect,
  filter = 'pending',
  onFilterChange = () => {},
  sortBy,
  onSortChange,
  selectedIds = [],
  onToggleSelect = () => {},
  onSelectAll = () => {}, counts
}) => {
  const displayRequests = filteredRequests || requests;

  const { missionTasks, remainingActive } = useMemo(() => {
    if (filter !== 'active') return { missionTasks: [], remainingActive: displayRequests };
    
    return displayRequests.reduce(
      (acc, req) => {
        if (req.delivery_status === 'in_progress') {
          acc.missionTasks.push(req);
        } else {
          acc.remainingActive.push(req);
        }
        return acc;
      },
      { missionTasks: [] as DeliveryRequest[], remainingActive: [] as DeliveryRequest[] }
    );
  }, [displayRequests, filter]);

  // LAYER 4: Grouping logic for Weekly Pulse + Overdue Guard
  const groupedRequests = useMemo(() => {
    const listToGroup = filter === 'active' ? remainingActive : displayRequests;
    if (sortBy !== 'day-of-week') return null;

    // BUSINESS RULE: Active tab should NOT be grouped by day to preserve the 1-2-3 sequence
    if (filter === 'active') return null;
    
    // BUSINESS RULE: Done tab is historical data and should be a flat list, not grouped
    if (filter === 'completed') return null;

    const groups: Record<string, DeliveryRequest[]> = {};
    if (filter !== 'completed') {
      groups['OVERDUE'] = [];
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    listToGroup.forEach(req => {
      try {
        if (!req.delivery_date) {
          if (!groups['Other']) groups['Other'] = [];
          groups['Other'].push(req);
          return;
        }
        const delDate = parseISO(req.delivery_date);
        delDate.setHours(0, 0, 0, 0);

        if (filter !== 'completed' && delDate < today) {
          if (!groups['OVERDUE']) groups['OVERDUE'] = [];
          groups['OVERDUE'].push(req);
        } else {
          const dayName = format(delDate, 'EEEE');
          if (!groups[dayName]) groups[dayName] = [];
          groups[dayName].push(req);
        }
      } catch (e) {
        if (!groups['Other']) groups['Other'] = [];
        groups['Other'].push(req);
      }
    });

    const finalOrder = filter === 'completed' ? DAY_ORDER : ['OVERDUE', ...DAY_ORDER];

    return finalOrder
      .filter(day => groups[day] && groups[day].length > 0)
      .map(day => ({
        day,
        tasks: groups[day]
      }));
  }, [displayRequests, sortBy, filter, remainingActive]);

  return (
    <div className="flex flex-col h-full bg-white border-r border-slate-100 shadow-sm overflow-hidden">
      {/* List Header / Filters */}
      <div className="p-4 pb-1 shrink-0">
        <div className="flex items-center gap-1.5 mb-4 bg-slate-100/50 p-1 rounded-xl">
          <button 
            onClick={() => onFilterChange('pending')}
            className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${filter === 'pending' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Pending ({counts ? counts.pending : requests.filter(isPendingRequest).length})
          </button>
          <button 
            onClick={() => onFilterChange('active')}
            className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${filter === 'active' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Active ({counts ? counts.active : requests.filter(isActiveRequest).length})
          </button>
          <button 
            onClick={() => onFilterChange('completed')}
            className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${filter === 'completed' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Done ({counts ? counts.done : requests.filter(isTerminalRequest).length})
          </button>
        </div>

        <div className="flex items-center justify-between px-1">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sort by:</span>
          <Select value={sortBy} onValueChange={onSortChange}>
            <SelectTrigger className="h-7 border-none shadow-none text-[11px] font-bold text-slate-700 bg-transparent hover:bg-slate-50 rounded-lg focus:ring-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-slate-100 shadow-xl">
              <SelectItem value="newest" className="text-xs font-bold">Time: Newest</SelectItem>
              <SelectItem value="oldest" className="text-xs font-bold">Time: Oldest</SelectItem>
              <SelectItem value="day-of-week" className="text-xs font-bold">🗓️ Day of Week</SelectItem>
              <SelectItem value="urgency" className="text-xs font-bold">🔥 Urgency</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Scrollable List with Horizontal Support */}
      <ScrollArea className="flex-1 overflow-x-auto">
        <div className="px-4 pb-4 mt-2 min-w-[320px]">
          {displayRequests.length === 0 ? (
            <div className="py-20 text-center">
              <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Package className="h-6 w-6 text-slate-200" />
              </div>
              <p className="text-slate-400 font-bold text-sm tracking-tight">No requests found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Mission Anchor (Pinned in_progress tasks) */}
              {filter === 'active' && missionTasks.length > 0 && (
                <div className="mb-6 bg-blue-50/50 p-4 rounded-2xl border border-blue-100 shadow-sm border-dashed">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-700">Mission Anchor (Live)</span>
                  </div>
                  <div className="space-y-2">
                    {missionTasks.map(req => (
                      <RequestCard 
                        key={req.request_id} 
                        request={req} 
                        isSelected={selectedId === req.request_id} 
                        onClick={() => onSelect(req.request_id)}
                        isMultiSelected={selectedIds.includes(req.request_id)}
                        onToggleSelection={onToggleSelect}
                        isActiveTab={true}
                      />
                    ))}
                  </div>
                </div>
              )}

              {groupedRequests ? (
                // Grouped View (OVERDUE + Monday - Sunday)
                groupedRequests.map(group => (
                  <div key={group.day} className="space-y-2">
                    <div className={cn(
                      "sticky top-0 z-10 py-2 px-1 flex items-center justify-between border-b mb-1 backdrop-blur-sm",
                      group.day === 'OVERDUE' ? "bg-rose-50/90 border-rose-100" : "bg-white/80 border-slate-50"
                    )}>
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-5 h-5 rounded-md flex items-center justify-center text-white",
                          group.day === 'OVERDUE' ? "bg-rose-600" : "bg-slate-900"
                        )}>
                          {group.day === 'OVERDUE' ? <AlertCircle size={12} /> : <Calendar size={12} />}
                        </div>
                        <span className={cn(
                          "text-[10px] font-black uppercase tracking-widest",
                          group.day === 'OVERDUE' ? "text-rose-700" : "text-slate-900"
                        )}>{group.day}</span>
                      </div>
                      <Badge 
                        label={`${group.tasks.length} tasks`} 
                        status={group.day === 'OVERDUE' ? 'error' : 'info'} 
                        className="text-[8px] h-4" 
                      />
                    </div>
                    <div className="space-y-2">
                      {group.tasks.map(req => (
                        <RequestCard 
                          key={req.request_id}
                          request={req}
                          isSelected={selectedId === req.request_id}
                          onClick={() => onSelect(req.request_id)}
                          isMultiSelected={selectedIds.includes(req.request_id)}
                          onToggleSelection={onToggleSelect}
                          isActiveTab={filter === 'active'}
                        />
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                // Flat View (Default)
                <AnimatePresence initial={false}>
                  {(filter === 'active' ? remainingActive : displayRequests).map(req => (
                    <motion.div
                      key={req.request_id}
                      layout
                      initial={{ opacity: 0, scale: 0.9, height: 0 }}
                      animate={{ opacity: 1, scale: 1, height: 'auto' }}
                      exit={{ 
                        opacity: 0, 
                        scale: 0.8, 
                        x: filter === 'pending' ? 100 : -100, 
                        height: 0,
                        transition: { duration: 0.3 }
                      }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    >
                      <RequestCard 
                        request={req}
                        isSelected={selectedId === req.request_id}
                        onClick={() => onSelect(req.request_id)}
                        isMultiSelected={selectedIds.includes(req.request_id)}
                        onToggleSelection={onToggleSelect}
                        isActiveTab={filter === 'active'}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

// Internal Badge for Header
interface BadgeProps {
  label: string;
  status: 'info' | 'error' | 'primary';
  className?: string;
}

function Badge({ label, status, className }: BadgeProps) {
  return (
    <span className={cn(
      "px-2 py-0.5 rounded-full font-black uppercase",
      status === 'info' ? "bg-slate-100 text-slate-600" : 
      status === 'error' ? "bg-rose-600 text-white shadow-sm" : "bg-primary/10 text-primary",
      className
    )}>
      {label}
    </span>
  );
}
