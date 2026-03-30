import React from 'react';
import { 
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
  Calculator,
  Search
} from 'lucide-react';
import { RequestType, CATEGORY_CONFIG } from '../types';

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

export const getTypeIcon = (type?: string) => {
  if (!type) return <Search className="h-4 w-4" />;
  const config = CATEGORY_CONFIG[type as RequestType];
  if (!config) return <Package className="h-4 w-4" />;
  const Icon = ICON_MAP[config.icon];
  return Icon ? <Icon className="h-4 w-4" /> : <Package className="h-4 w-4" />;
};

export const getTypeColor = (type?: string) => {
  if (!type) return 'text-slate-500 bg-slate-50 border-slate-100';
  const config = CATEGORY_CONFIG[type as RequestType];
  if (!config) return 'text-slate-500 bg-slate-50 border-slate-100';
  return `${config.color} ${config.bgColor} ${config.borderColor}`;
};
