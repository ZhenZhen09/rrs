import React, { useState } from 'react';
import { 
  Check, 
  Search, 
  MoveRight,
  Briefcase,
  Banknote,
  ShieldCheck,
  Wallet,
  CreditCard,
  FileText,
  Users,
  Gift,
  FileSignature,
  ArrowLeftRight,
  Truck,
  MapPin,
  PackageCheck,
  Activity,
  RefreshCcw,
  HeartPulse,
  Megaphone,
  Bike,
  FileCheck,
  HelpingHand,
  BookOpen,
  ClipboardCheck,
  Receipt,
  Package,
  ShoppingCart,
  UserPlus,
  PenTool,
  Sparkles,
  ShieldPlus,
  Calculator
} from 'lucide-react';
import { cn } from './utils';
import { RequestType, REQUEST_CATEGORIES, CATEGORY_CONFIG } from '../../types';
import { Button } from './button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from './command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './popover';

const ICON_MAP: Record<string, React.ElementType> = {
  Briefcase,
  Banknote,
  ShieldCheck,
  Wallet,
  CreditCard,
  FileText,
  Users,
  Gift,
  FileSignature,
  ArrowLeftRight,
  Truck,
  MapPin,
  PackageCheck,
  Activity,
  RefreshCcw,
  HeartPulse,
  Megaphone,
  Bike,
  FileCheck,
  HelpingHand,
  BookOpen,
  ClipboardCheck,
  Receipt,
  Package,
  ShoppingCart,
  UserPlus,
  PenTool,
  Sparkles,
  ShieldPlus,
  Calculator
};

interface CategoryPickerProps {
  value: RequestType | null;
  onChange: (value: RequestType) => void;
}

export const CategoryPicker: React.FC<CategoryPickerProps> = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);

  const selectedConfig = value ? CATEGORY_CONFIG[value] : null;
  const SelectedIcon = selectedConfig ? ICON_MAP[selectedConfig.icon] : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "h-auto w-full justify-between p-4 rounded-2xl border-2 transition-all shadow-none group",
            selectedConfig 
              ? `${selectedConfig.bgColor} ${selectedConfig.borderColor} hover:bg-white` 
              : "border-slate-100 bg-slate-50/50 hover:bg-white hover:border-[#00B14F]/20"
          )}
        >
          <div className="flex items-center gap-3">
            {selectedConfig && SelectedIcon ? (
              <div className={cn("p-2 rounded-xl", selectedConfig.color, "bg-white shadow-sm")}>
                <SelectedIcon className="h-5 w-5" />
              </div>
            ) : (
              <div className="p-2 rounded-xl bg-slate-200 text-slate-400">
                <Search className="h-5 w-5" />
              </div>
            )}
            <div className="text-left">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
                {value ? "Selected Category" : "Category"}
              </p>
              <span className={cn(
                "text-sm font-black leading-none",
                value ? "text-slate-900" : "text-slate-400"
              )}>
                {value || "Choose Category"}
              </span>
            </div>
          </div>
          <MoveRight className={cn(
            "h-4 w-4 transition-all group-hover:translate-x-1",
            value ? "text-slate-400" : "text-slate-300"
          )} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0 rounded-3xl border-none shadow-2xl overflow-hidden" align="start">
        <Command className="rounded-none border-none">
          <div className="p-4 bg-slate-900">
            <CommandInput placeholder="Search 30+ categories..." className="h-12 bg-white/10 border-none text-white placeholder:text-slate-500 rounded-xl" />
          </div>
          <CommandList className="max-h-[400px]">
            <CommandEmpty className="p-10 text-center">
              <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Search className="text-slate-300 h-6 w-6" />
              </div>
              <p className="text-slate-400 font-bold text-sm">No category found matching your search.</p>
            </CommandEmpty>
            {Object.entries(REQUEST_CATEGORIES).map(([group, types]) => (
              <CommandGroup key={group} heading={<span className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-2 py-2">{group}</span>}>
                {types.map((type) => {
                  const config = CATEGORY_CONFIG[type as RequestType];
                  const Icon = ICON_MAP[config.icon];
                  return (
                    <CommandItem
                      key={type}
                      value={type}
                      onSelect={() => {
                        onChange(type as RequestType);
                        setOpen(false);
                      }}
                      className="rounded-xl mx-2 my-0.5 py-3 px-4 font-bold text-slate-700 data-[selected=true]:bg-slate-50 data-[selected=true]:text-[#00B14F] flex items-center justify-between group cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "p-1.5 rounded-lg transition-colors bg-slate-100",
                          "group-data-[selected=true]:bg-[#00B14F]/10 group-data-[selected=true]:text-[#00B14F]"
                        )}>
                          {Icon && <Icon className="h-4 w-4" />}
                        </div>
                        {type}
                      </div>
                      {value === type && <Check className="h-4 w-4 text-[#00B14F]" strokeWidth={3} />}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
