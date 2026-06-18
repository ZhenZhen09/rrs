import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import { 
  AlertTriangle, 
  UserPlus, 
  Calendar as CalendarIcon, 
  Loader2,
  CheckCircle2,
  Bike,
  X
} from 'lucide-react';
import { format } from 'date-fns';
import { DeliveryRequest, User } from '../../types';
import { toast } from 'sonner';

interface ConflictResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  riderId: string;
  riderName: string;
  date: string;
  onSuccess: () => void;
}

export const ConflictResolutionModal: React.FC<ConflictResolutionModalProps> = ({
  isOpen,
  onClose,
  riderId,
  riderName,
  date,
  onSuccess
}) => {
  const [tasks, setTasks] = useState<DeliveryRequest[]>([]);
  const [riders, setRiders] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setIsSubmitting] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [action, setAction] = useState<'reassign' | 'reschedule' | null>(null);
  const [targetRiderId, setTargetRiderId] = useState('');
  const [targetDate, setTargetDate] = useState(date);

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen, riderId, date]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch orphaned tasks for this rider and date
      const tasksRes = await fetch(`/api/requests?rider_id=${riderId}&delivery_status=assigned,in_progress,arrived`, {
        credentials: 'include'
      });
      const tasksData = await tasksRes.json();
      // Filter by date manually
      const filteredTasks = (tasksData.data || []).filter((t: DeliveryRequest) => t.delivery_date === date);
      setTasks(filteredTasks);
      setSelectedTaskIds(filteredTasks.map((t: DeliveryRequest) => t.request_id));

      // 2. Fetch available riders
      const ridersRes = await fetch('/api/users/riders', { credentials: 'include' });
      const ridersData = await ridersRes.json();
      setRiders(ridersData.filter((r: User) => r.id !== riderId));
    } catch (e) {
      toast.error("Failed to load conflict data");
    } finally {
      setLoading(false);
    }
  };

  const handleMassUpdate = async () => {
    if (selectedTaskIds.length === 0) {
      toast.error("Please select at least one task");
      return;
    }

    if (action === 'reassign' && !targetRiderId) {
      toast.error("Please select a target rider");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/requests/mass-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskIds: selectedTaskIds,
          action,
          value: action === 'reassign' ? targetRiderId : targetDate
        }),
        credentials: 'include'
      });

      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        onSuccess();
        onClose();
      } else {
        toast.error(data.error || "Update failed");
      }
    } catch (e) {
      toast.error("Network error during mass update");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleTask = (id: string) => {
    setSelectedTaskIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg rounded-[1.5rem] p-0 overflow-hidden border-none shadow-2xl max-h-[90vh] flex flex-col">
        {/* Compact Header */}
        <div className="bg-rose-500 p-5 text-white shrink-0 relative">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
              <AlertTriangle className="h-6 w-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl font-[900] tracking-tight text-white leading-tight">
                Resolve Absence Conflicts
              </DialogTitle>
              <DialogDescription className="text-rose-100 font-bold mt-0.5 text-xs">
                Rider {riderName} is unavailable on {date ? format(new Date(date), 'MMMM d, yyyy') : 'N/A'}
              </DialogDescription>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 space-y-5 overflow-y-auto custom-sidebar-scrollbar flex-1">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3">
              <Loader2 className="h-6 w-6 text-rose-500 animate-spin" />
              <p className="text-slate-400 font-black text-[9px] uppercase tracking-widest">Identifying orphaned tasks...</p>
            </div>
          ) : (
            <>
              {/* Task Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                    Affected Tasks ({tasks.length})
                  </h4>
                  <Badge variant="outline" className="text-[8px] font-black text-rose-500 border-rose-100 bg-rose-50 px-1.5">
                    {selectedTaskIds.length} SELECTED
                  </Badge>
                </div>

                <div className="max-h-[220px] overflow-auto space-y-2 pr-1 custom-sidebar-scrollbar">
                  {tasks.length === 0 ? (
                    <div className="py-6 text-center bg-slate-50 rounded-xl border-2 border-dashed border-slate-100">
                       <CheckCircle2 className="h-6 w-6 text-emerald-400 mx-auto mb-1.5" />
                       <p className="text-slate-500 text-[10px] font-bold">No active tasks found for this date.</p>
                    </div>
                  ) : (
                    tasks.map(task => (
                      <div 
                        key={task.request_id}
                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                          selectedTaskIds.includes(task.request_id) 
                            ? 'bg-rose-50 border-rose-200 shadow-sm ring-1 ring-rose-200' 
                            : 'bg-white border-slate-100 hover:border-slate-200'
                        }`}
                        onClick={() => toggleTask(task.request_id)}
                      >
                        <Checkbox 
                          checked={selectedTaskIds.includes(task.request_id)}
                          onCheckedChange={() => toggleTask(task.request_id)}
                          className="h-4 w-4 data-[state=checked]:bg-rose-500 data-[state=checked]:border-rose-500"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-black text-slate-900">#{task.request_id.slice(-6).toUpperCase()}</span>
                            <Badge className="text-[7px] font-black h-3.5 px-1 uppercase bg-slate-900 text-white border-none">
                              {task.time_window}
                            </Badge>
                          </div>
                          <p className="text-[10px] font-bold text-slate-600 mt-0.5 truncate">{task.recipient_name} - {task.dropoff_location.address}</p>
                        </div>
                        <Badge variant="outline" className="text-[7px] font-black px-1 py-0 border-slate-200 text-slate-500 shrink-0">
                          {task.delivery_status?.toUpperCase()}
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Action Tabs */}
              {tasks.length > 0 && (
                <div className="space-y-4 pt-4 border-t border-slate-50">
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      className={`h-11 rounded-xl border flex items-center justify-center gap-2 transition-all ${
                        action === 'reassign' ? 'border-primary bg-primary/5 text-primary' : 'border-slate-100 text-slate-500'
                      }`}
                      onClick={() => setAction('reassign')}
                    >
                      <UserPlus size={14} />
                      <span className="text-[9px] font-black uppercase tracking-wider">Mass Reassign</span>
                    </Button>
                    <Button
                      variant="outline"
                      className={`h-11 rounded-xl border flex items-center justify-center gap-2 transition-all ${
                        action === 'reschedule' ? 'border-primary bg-primary/5 text-primary' : 'border-slate-100 text-slate-500'
                      }`}
                      onClick={() => setAction('reschedule')}
                    >
                      <CalendarIcon size={14} />
                      <span className="text-[9px] font-black uppercase tracking-wider">Mass Reschedule</span>
                    </Button>
                  </div>

                  {/* Contextual Options */}
                  {action === 'reassign' && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                      <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">
                        Select Target Rider
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {riders.map(r => (
                          <button
                            key={r.id}
                            onClick={() => setTargetRiderId(r.id)}
                            className={`flex items-center gap-2 p-2.5 rounded-lg border text-left transition-all ${
                              targetRiderId === r.id 
                                ? 'bg-primary border-primary text-white shadow-md' 
                                : 'bg-white border-slate-100 hover:border-slate-200 text-slate-600'
                            }`}
                          >
                            <Bike size={12} className={targetRiderId === r.id ? 'text-white' : 'text-slate-400'} />
                            <span className="text-[10px] font-black truncate">{r.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {action === 'reschedule' && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                      <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">
                        Select New Delivery Date
                      </label>
                      <input 
                        type="date"
                        value={targetDate}
                        min={new Date().toISOString().split('T')[0]}
                        onChange={(e) => setTargetDate(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all"
                      />
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Compact Footer */}
        <DialogFooter className="p-5 bg-slate-50/50 border-t border-slate-50 flex items-center justify-between gap-4 shrink-0">
          <Button 
            variant="ghost" 
            onClick={onClose}
            className="rounded-lg font-black text-[9px] uppercase tracking-widest text-slate-400 hover:text-slate-900 h-9"
          >
            Cancel
          </Button>
          <Button
            disabled={!action || submitting || tasks.length === 0}
            onClick={handleMassUpdate}
            className="rounded-lg bg-slate-900 text-white hover:bg-black font-black text-[9px] uppercase tracking-widest h-9 px-6 shadow-lg"
          >
            {submitting ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              `Confirm ${action === 'reassign' ? 'Reassignment' : 'Rescheduling'}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
