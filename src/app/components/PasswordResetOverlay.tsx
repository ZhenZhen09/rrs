import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Eye, EyeOff, CheckCircle2, ShieldCheck, XCircle, Delete } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { PasswordStrengthMeter } from './PasswordStrengthMeter';

interface Props {
  visible: boolean;
  userId: string;
  userRole: string; // 'rider', 'personnel', 'admin'
  onClose: () => void;
  onSuccess: () => void;
}

export function PasswordResetOverlay({ visible, userId, userRole, onClose, onSuccess }: Props) {
  const isRider = userRole === 'rider';
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Reset state when visibility changes
  useEffect(() => {
    if (visible) {
      setPassword('');
      setConfirmPassword('');
      setError('');
    }
  }, [visible]);

  const validation = {
    length: isRider ? password.length === 4 : password.length >= 8,
    number: isRider ? /^\d+$/.test(password) : /\d/.test(password),
    special: isRider ? true : /[!@#$%^&*(),.?":{}|<>]/.test(password),
    match: password.length > 0 && password === confirmPassword
  };

  const score = isRider 
    ? (password.length === 4 ? 3 : (password.length > 0 ? 1 : 0))
    : [validation.length, validation.number, validation.special].filter(Boolean).length;
    
  const isReady = isRider 
    ? (password.length === 4 && validation.match)
    : (score === 3 && validation.match);

  const handleUpdate = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!isReady) return;

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/update-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, newPassword: password }),
        credentials: 'include'
      });

      if (response.ok) {
        onSuccess();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to update credentials');
      }
    } catch (err: any) {
      setError('Connection error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePinPress = (num: string) => {
    if (password.length < 4) setPassword(prev => prev + num);
  };

  const handleConfirmPinPress = (num: string) => {
    if (confirmPassword.length < 4) setConfirmPassword(prev => prev + num);
  };

  const handleDelete = (isConfirm: boolean) => {
    if (isConfirm) setConfirmPassword(prev => prev.slice(0, -1));
    else setPassword(prev => prev.slice(0, -1));
  };

  return (
    <AnimatePresence>
      {visible && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            onClick={onClose}
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-lg"
          >
            <Card className="border-none shadow-2xl rounded-[2.5rem] overflow-hidden bg-white/95 backdrop-blur-xl ring-1 ring-black/5">
              <CardHeader className="pt-10 pb-6 text-center space-y-2">
                <div className="mx-auto w-16 h-16 bg-amber-100 rounded-3xl flex items-center justify-center mb-4 shadow-inner ring-1 ring-amber-200">
                  <ShieldCheck className="text-amber-600 h-8 w-8" />
                </div>
                <CardTitle className="text-3xl font-black text-slate-900 tracking-tight">
                  {isRider ? 'Secure Your PIN' : 'Secure Your Account'}
                </CardTitle>
                <CardDescription className="text-slate-500 font-medium px-8 text-base">
                  {isRider 
                    ? 'Please set a new 4-digit PIN for your mobile check-ins.'
                    : 'This is your first login. Please set a private password to access your dashboard.'
                  }
                </CardDescription>
              </CardHeader>

              <CardContent className="px-10 pb-12">
                {isRider ? (
                   <div className="space-y-8">
                      {/* PIN ENTRY */}
                      <div className="space-y-4">
                        <Label className="text-xs font-black uppercase tracking-widest text-slate-500 text-center block">New 4-Digit PIN</Label>
                        <div className="flex justify-center gap-4">
                          {[0, 1, 2, 3].map(i => (
                            <div key={i} className={`w-14 h-16 rounded-2xl border-2 flex items-center justify-center text-2xl font-black transition-all ${
                              password[i] ? 'border-amber-500 bg-amber-50/50 text-slate-900' : 'border-slate-200 bg-slate-50 text-slate-300'
                            }`}>
                              {password[i] ? '•' : ''}
                            </div>
                          ))}
                        </div>
                        <div className="grid grid-cols-3 gap-3 max-w-[280px] mx-auto pt-2">
                          {[1,2,3,4,5,6,7,8,9].map(n => (
                            <button key={n} onClick={() => handlePinPress(n.toString())} className="h-12 rounded-xl bg-slate-100 hover:bg-slate-200 font-black text-slate-800 transition-colors">{n}</button>
                          ))}
                          <div />
                          <button onClick={() => handlePinPress('0')} className="h-12 rounded-xl bg-slate-100 hover:bg-slate-200 font-black text-slate-800 transition-colors">0</button>
                          <button onClick={() => handleDelete(false)} className="h-12 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"><Delete size={20}/></button>
                        </div>
                      </div>

                      {/* CONFIRM PIN */}
                      <div className="space-y-4">
                        <Label className="text-xs font-black uppercase tracking-widest text-slate-500 text-center block">Confirm PIN</Label>
                        <div className="flex justify-center gap-4">
                          {[0, 1, 2, 3].map(i => (
                            <div key={i} className={`w-14 h-16 rounded-2xl border-2 flex items-center justify-center text-2xl font-black transition-all ${
                              confirmPassword[i] ? (validation.match ? 'border-emerald-500 bg-emerald-50 text-emerald-600' : 'border-amber-500 bg-amber-50 text-slate-900') : 'border-slate-200 bg-slate-50 text-slate-300'
                            }`}>
                              {confirmPassword[i] ? '•' : ''}
                            </div>
                          ))}
                        </div>
                        <div className="grid grid-cols-3 gap-3 max-w-[280px] mx-auto pt-2">
                          {[1,2,3,4,5,6,7,8,9].map(n => (
                            <button key={n} onClick={() => handleConfirmPinPress(n.toString())} className="h-12 rounded-xl bg-slate-100 hover:bg-slate-200 font-black text-slate-800 transition-colors">{n}</button>
                          ))}
                          <div />
                          <button onClick={() => handleConfirmPinPress('0')} className="h-12 rounded-xl bg-slate-100 hover:bg-slate-200 font-black text-slate-800 transition-colors">0</button>
                          <button onClick={() => handleDelete(true)} className="h-12 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"><Delete size={20}/></button>
                        </div>
                      </div>
                      
                      <div className="pt-4">
                        <Button 
                          onClick={() => handleUpdate()}
                          disabled={!isReady || isLoading}
                          className="w-full h-14 bg-slate-900 hover:bg-black text-white text-lg font-black rounded-2xl transition-all shadow-xl active:scale-[0.98] border-none disabled:opacity-50 uppercase tracking-widest"
                        >
                          {isLoading ? 'Saving...' : 'Set PIN & Continue'}
                        </Button>
                      </div>
                   </div>
                ) : (
                  <form onSubmit={handleUpdate} className="space-y-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">New Password</Label>
                        <div className="relative group">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-amber-600 transition-colors" size={18} />
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="••••••••"
                            className="bg-slate-50 border-slate-200 h-14 rounded-2xl pl-12 pr-12 text-slate-800 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-mono"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoFocus
                            required
                          />
                          <button 
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                          >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                      </div>

                      <PasswordStrengthMeter score={score} />

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-2">
                        <CheckItem label="At least 8 characters" valid={validation.length} />
                        <CheckItem label="Includes 1 number" valid={validation.number} />
                        <CheckItem label="Includes 1 special char" valid={validation.special} />
                      </div>

                      <div className="space-y-2 pt-2">
                        <Label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Confirm Password</Label>
                        <div className="relative group">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-amber-600 transition-colors" size={18} />
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="••••••••"
                            className={`bg-slate-50 h-14 rounded-2xl pl-12 pr-12 text-slate-800 transition-all font-mono border-2 ${
                              validation.match ? 'border-emerald-500/50 bg-emerald-50/10' : 'border-slate-200 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500'
                            }`}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                          />
                          {validation.match && (
                            <motion.div 
                              initial={{ scale: 0 }} 
                              animate={{ scale: 1 }} 
                              className="absolute right-4 top-1/2 -translate-y-1/2"
                            >
                              <CheckCircle2 className="text-emerald-500" size={20} />
                            </motion.div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="pt-2">
                      <Button 
                        type="submit" 
                        disabled={!isReady || isLoading}
                        className="w-full h-14 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white text-lg font-black rounded-2xl transition-all shadow-xl shadow-amber-600/30 active:scale-[0.98] border-none disabled:opacity-50"
                      >
                        {isLoading ? 'Processing...' : 'Update & Access Dashboard'}
                      </Button>
                    </div>
                  </form>
                )}

                {error && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                    <div className="bg-rose-50 border border-rose-100 text-rose-600 rounded-xl p-3 flex items-center gap-2 text-sm font-bold uppercase tracking-tight mt-4">
                      <XCircle size={16} />
                      {error}
                    </div>
                  </motion.div>
                )}

                <button 
                  type="button"
                  onClick={onClose}
                  className="w-full mt-4 text-slate-400 font-bold text-xs uppercase tracking-widest hover:text-slate-600 transition-colors"
                >
                  Cancel
                </button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function CheckItem({ label, valid }: { label: string, valid: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <motion.div
        animate={{ 
          scale: valid ? [1, 1.2, 1] : 1,
          color: valid ? '#10b981' : '#cbd5e1'
        }}
      >
        <CheckCircle2 size={16} />
      </motion.div>
      <span className={`text-[11px] font-bold uppercase tracking-wider transition-colors ${valid ? 'text-slate-700' : 'text-slate-400'}`}>
        {label}
      </span>
    </div>
  );
}
