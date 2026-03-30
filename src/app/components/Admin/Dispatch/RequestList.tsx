import React from 'react';
import { RequestCard } from './RequestCard';
import { DeliveryRequest } from '../../../types';
import { ScrollArea } from '../../ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Package } from 'lucide-react';

interface RequestListProps {
  requests: DeliveryRequest[];
  filteredRequests: DeliveryRequest[];
  selectedId: string | null;
  onSelect: (req: DeliveryRequest) => void;
  filter: string;
  onFilterChange: (filter: string) => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
  selectedRequestIds?: string[];
  onToggleSelection?: (requestId: string) => void;
}

export const RequestList: React.FC<RequestListProps> = ({ 
  requests,
  filteredRequests,
  selectedId, 
  onSelect,
  filter,
  onFilterChange,
  sortBy,
  onSortChange,
  selectedRequestIds = [],
  onToggleSelection
}) => {
  return (
    <div className="flex flex-col h-full bg-white border-r border-slate-100 shadow-sm overflow-hidden">
      {/* List Header / Filters */}
      <div className="p-6 pb-2 shrink-0">
        <div className="flex items-center gap-2 mb-6 bg-slate-100/50 p-1.5 rounded-2xl">
          <button 
            onClick={() => onFilterChange('pending')}
            className={`flex-1 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${filter === 'pending' ? 'bg-white text-slate-900 shadow-md shadow-slate-200/50' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Pending ({requests.filter(r => r.status === 'pending').length})
          </button>
          <button 
            onClick={() => onFilterChange('active')}
            className={`flex-1 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${filter === 'active' ? 'bg-white text-slate-900 shadow-md shadow-slate-200/50' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Active ({requests.filter(r => r.status === 'approved' && r.delivery_status !== 'completed' && r.delivery_status !== 'failed').length})
          </button>
          <button 
            onClick={() => onFilterChange('completed')}
            className={`flex-1 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${filter === 'completed' ? 'bg-white text-slate-900 shadow-md shadow-slate-200/50' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Done ({requests.filter(r => r.delivery_status === 'completed' || r.delivery_status === 'failed' || r.status === 'disapproved').length})
          </button>
        </div>

        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sort by:</span>
          <Select value={sortBy} onValueChange={onSortChange}>
            <SelectTrigger className="h-8 border-none shadow-none text-xs font-bold text-slate-700 bg-transparent hover:bg-slate-50 rounded-lg focus:ring-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-slate-100 shadow-xl">
              <SelectItem value="newest" className="font-bold">Time: Newest</SelectItem>
              <SelectItem value="oldest" className="font-bold">Time: Oldest</SelectItem>
              <SelectItem value="urgency" className="font-bold">Urgency</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Scrollable List with Horizontal Support */}
      <ScrollArea className="flex-1 overflow-x-auto">
        <div className="px-6 pb-6 mt-4 min-w-[320px]">
          {filteredRequests.length === 0 ? (
            <div className="py-20 text-center">
              <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Package className="h-6 w-6 text-slate-200" />
              </div>
              <p className="text-slate-400 font-bold text-sm tracking-tight">No requests found</p>
            </div>
          ) : (
            filteredRequests.map(req => (
              <RequestCard 
                key={req.request_id}
                request={req}
                isSelected={selectedId === req.request_id}
                onClick={() => onSelect(req)}
                isMultiSelected={selectedRequestIds.includes(req.request_id)}
                onToggleSelection={onToggleSelection}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
