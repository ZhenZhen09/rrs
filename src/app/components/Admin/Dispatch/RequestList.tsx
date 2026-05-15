import React from 'react';
import { RequestCard } from './RequestCard';
import { DeliveryRequest } from '../../../types';
import { ScrollArea } from '../../ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Package } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
  onSelectAll?: () => void;
}

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
  onSelectAll = () => {}
}) => {
  const displayRequests = filteredRequests || requests;

  return (
    <div className="flex flex-col h-full bg-white border-r border-slate-100 shadow-sm overflow-hidden">
      {/* List Header / Filters */}
      <div className="p-4 pb-1 shrink-0">
        <div className="flex items-center gap-1.5 mb-4 bg-slate-100/50 p-1 rounded-xl">
          <button 
            onClick={() => onFilterChange('pending')}
            className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${filter === 'pending' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Pending ({requests.filter(r => r.status === 'pending').length})
          </button>
          <button 
            onClick={() => onFilterChange('active')}
            className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${filter === 'active' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Active ({requests.filter(r => r.status === 'approved' && !['completed', 'failed', 'disapproved'].includes(r.delivery_status || '')).length})
          </button>
          <button 
            onClick={() => onFilterChange('completed')}
            className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${filter === 'completed' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Done ({requests.filter(r => ['completed', 'failed', 'disapproved'].includes(r.delivery_status || '') || r.status === 'disapproved').length})
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
              <SelectItem value="urgency" className="text-xs font-bold">Urgency</SelectItem>
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
            <div className="space-y-2">
              <AnimatePresence initial={false}>
                {displayRequests.map(req => (
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
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
