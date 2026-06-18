import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { ShieldAlert, CheckCircle2, XCircle, MapPin, Camera } from 'lucide-react';
import { cn } from "../ui/utils";
import { toast } from "sonner";

interface DeviationApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  deviationData: {
    riderId: string;
    riderName: string;
    requestId: string;
    reason: string;
    photoUrl?: string;
    sequencePos: number;
  };
  onResolve: (approved: boolean, adminNote: string) => Promise<void>;
}

export const DeviationApprovalModal: React.FC<DeviationApprovalModalProps> = ({
  isOpen,
  onClose,
  deviationData,
  onResolve
}) => {
  const [adminNote, setAdminNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleResolve = async (approved: boolean) => {
    setIsSubmitting(true);
    try {
      await onResolve(approved, adminNote);
      toast.success(approved ? "Deviation approved. Sequence adjusted." : "Deviation declined.");
      onClose();
    } catch (e) {
      toast.error("Failed to process decision.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl">
        <div className="p-8 space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center">
              <ShieldAlert className="text-amber-500 h-6 w-6" />
            </div>
            <div>
              <h3 className="text-xl font-[900] text-slate-900 tracking-tight">
                Sequence Deviation Request
              </h3>
              <p className="text-sm font-bold text-slate-400">
                Action required for {deviationData.riderName}
              </p>
            </div>
          </div>

          <div className="bg-slate-50 rounded-3xl p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Requested Skip</p>
                <p className="text-lg font-black text-slate-900">#{deviationData.requestId.slice(-8).toUpperCase()}</p>
                <p className="text-xs font-bold text-slate-500 mt-1">Current Position: #{deviationData.sequencePos} in Queue</p>
              </div>
              <div className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-[10px] font-black uppercase tracking-widest">
                High Alert
              </div>
            </div>

            <div className="border-t border-slate-200 pt-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Rider Alibi</p>
              <p className="text-sm font-bold text-slate-700 leading-relaxed italic">
                "{deviationData.reason}"
              </p>
            </div>

            {deviationData.photoUrl ? (
              <div className="aspect-video rounded-2xl overflow-hidden bg-slate-200 border-2 border-white shadow-inner relative group">
                <img 
                  src={deviationData.photoUrl} 
                  alt="Rider Proof" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Button variant="ghost" className="text-white font-black text-[10px] uppercase">
                    View Full Resolution
                  </Button>
                </div>
              </div>
            ) : (
              <div className="h-32 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400">
                <Camera size={24} className="mb-2" />
                <p className="text-[10px] font-black uppercase">No Photo Alibi Provided</p>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
              Admin Decision Note
            </Label>
            <Textarea
              placeholder="Instructions for the rider regarding this deviation..."
              className="rounded-2xl border-slate-100 bg-slate-50 font-bold text-sm min-h-[100px] resize-none"
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="bg-slate-50 p-6 gap-3">
          <Button
            variant="ghost"
            onClick={() => handleResolve(false)}
            disabled={isSubmitting}
            className="flex-1 h-14 rounded-2xl bg-white border-2 border-slate-100 hover:bg-rose-50 hover:border-rose-100 text-rose-500 font-black uppercase tracking-widest text-xs"
          >
            <XCircle className="mr-2 h-4 w-4" />
            Decline & Enforce
          </Button>
          <Button
            onClick={() => handleResolve(true)}
            disabled={isSubmitting}
            className="flex-1 h-14 rounded-2xl bg-slate-900 hover:bg-black text-white font-black uppercase tracking-widest text-xs shadow-xl shadow-slate-900/20"
          >
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Approve Skip
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
