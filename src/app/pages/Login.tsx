import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Truck, AlertCircle, Lock, Mail, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { LightTrails } from '../components/LightTrails';
import { PasswordResetOverlay } from '../components/PasswordResetOverlay';

export function Login() {
  const navigate = useNavigate();
  const { login, user, isAuthenticated } = useAuth();

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Password Reset States
  const [resetOverlayVisible, setResetOverlayVisible] = useState(false);
  const [resetUserId, setResetUserId] = useState('');
  const [resetUserRole, setResetUserRole] = useState('');

  // MFA States
  const [mfaStep, setMfaStep] = useState<'credentials' | 'setup' | 'verify'>('credentials');
  const [mfaData, setMfaData] = useState<{ userId: string; qrCode?: string; secret?: string } | null>(null);
  const [mfaToken, setMfaToken] = useState('');

  // Auto-redirect if already logged in
  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(`/${user.role}/dashboard`, { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await login(loginEmail.trim(), loginPassword);
      
      if (result.success) {
        // Success: useEffect will handle redirection
      } else if (result.requirePasswordReset) {
        setResetUserId(result.userId || '');
        setResetUserRole(result.role || '');
        setResetOverlayVisible(true);
      } else if (result.mfa_required) {
        setMfaData({ userId: result.userId! });
        setMfaStep('verify');
      } else if (result.mfa_setup_required) {
        // Initialize setup
        const setupRes = await fetch('/api/auth/mfa/setup-init', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: result.userId }),
          credentials: 'include'
        });
        if (setupRes.ok) {
          const setupData = await setupRes.json();
          setMfaData({ userId: result.userId!, qrCode: setupData.qrCode, secret: setupData.secret });
          setMfaStep('setup');
        } else {
          setError('Failed to initialize MFA setup');
        }
      } else {
        setError(result.error || 'Invalid credentials. Please try again.');
      }
    } catch (err: any) {
       setError(`Connection error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMfaVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const endpoint = mfaStep === 'setup' ? '/api/auth/mfa/setup-verify' : '/api/auth/mfa/verify-login';
      const body = mfaStep === 'setup' 
        ? { userId: mfaData?.userId, secret: mfaData?.secret, token: mfaToken }
        : { userId: mfaData?.userId, token: mfaToken };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        // Log user in
        const userToSet = mfaStep === 'setup' ? data.user : data;
        
        localStorage.setItem('currentUser', JSON.stringify(userToSet));
        window.location.reload(); // Simple way to trigger AuthContext update
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Invalid MFA code');
      }
    } catch (err: any) {
      setError(`MFA Verification error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#fdfcfb] font-sans overflow-hidden">
      {/* LEFT SIDE: Branding & Image Context */}
      <div className="relative flex-1 hidden md:flex flex-col items-center justify-center bg-[#f3bc2c] overflow-hidden">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="relative z-10 w-full h-full flex items-center justify-center p-12"
        >
          <img 
            src="/assets/images/logo.png" 
            alt="GoFinance Logo" 
            className="max-w-full max-h-full object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.2)]"
          />
        </motion.div>

        {/* Decorative subtle pulse */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.1, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0 bg-white"
        />
      </div>

      {/* RIGHT SIDE: Interfaces */}
      <div className="flex-[0.8] lg:flex-[0.7] relative flex items-center justify-center p-6 bg-slate-50 md:bg-transparent">
        <div className="absolute inset-0 md:hidden bg-gradient-to-br from-amber-600 to-amber-800" />
        
        <div className="relative z-10 w-full max-w-md">
          <AnimatePresence mode="wait">
            {mfaStep === 'credentials' ? (
              <motion.div
                key="login-step"
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -20 }}
                transition={{ duration: 0.4, ease: "circOut" }}
              >
                <div className="md:hidden text-center mb-8">
                  <h1 className="text-3xl font-black text-white italic tracking-tighter uppercase tracking-widest">GoFinance</h1>
                </div>

                <Card className="border-white/40 bg-white/70 backdrop-blur-3xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] rounded-[2.5rem] p-4 border-2 ring-1 ring-white/20">
                  <CardHeader className="space-y-1 text-center pt-8 pb-6">
                    <CardTitle className="text-4xl font-black tracking-tight text-slate-900">Sign in</CardTitle>
                    <CardDescription className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">
                      Authorized Personnel Gateway
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="px-6 pb-10">
                    <form onSubmit={handleLogin} className="space-y-6">
                      <div className="space-y-2">
                        <div className="relative group">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-amber-600 transition-colors" size={20} />
                          <Input
                            id="login-email"
                            type="email"
                            placeholder="Email address"
                            className="bg-white/80 border-slate-200 h-14 rounded-2xl pl-12 pr-4 text-slate-800 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all shadow-sm"
                            value={loginEmail}
                            onChange={(e) => setLoginEmail(e.target.value)}
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="relative group">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-amber-600 transition-colors" size={20} />
                          <Input
                            id="login-password"
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Password"
                            className="bg-white/80 border-slate-200 h-14 rounded-2xl pl-12 pr-12 text-slate-800 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all shadow-sm"
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            required
                          />
                          <button 
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                          >
                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                          </button>
                        </div>
                        <div className="flex justify-end px-1">
                          <button 
                            type="button"
                            onClick={() => alert("Please contact your administrator to reset your secure credentials.")}
                            className="text-xs font-bold text-amber-700 hover:text-amber-800 transition-colors"
                          >
                            Forgot password?
                          </button>
                        </div>
                      </div>

                      <AnimatePresence>
                        {error && (
                          <motion.div
                            initial={{ opacity: 0, height: 0, marginTop: 0 }}
                            animate={{ opacity: 1, height: "auto", marginTop: 8 }}
                            exit={{ opacity: 0, height: 0, marginTop: 0 }}
                          >
                            <Alert className="bg-red-50/50 border-red-100 text-red-600 rounded-xl py-3 border backdrop-blur-sm">
                              <AlertCircle className="h-4 w-4" />
                              <AlertDescription className="text-xs font-bold uppercase tracking-tight ml-2">{error}</AlertDescription>
                            </Alert>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <div className="space-y-4 pt-2">
                        <Button 
                          type="submit" 
                          disabled={isLoading}
                          className="w-full h-14 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white text-lg font-black rounded-2xl transition-all shadow-xl shadow-amber-600/30 active:scale-[0.98] border-none"
                        >
                          {isLoading ? (
                            <motion.div 
                              className="flex items-center justify-center gap-3"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                            >
                              <motion.div
                                animate={{ x: [-20, 20], opacity: [0, 1, 0] }}
                                transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                              >
                                <Truck size={24} />
                              </motion.div>
                              <span className="uppercase tracking-widest text-sm">Verifying</span>
                            </motion.div>
                          ) : (
                            <span className="uppercase tracking-widest">Sign In</span>
                          )}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <motion.div
                key="mfa-step"
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -20 }}
                transition={{ duration: 0.4, ease: "circOut" }}
              >
                <Card className="w-full max-w-md border-white/40 bg-white/70 backdrop-blur-3xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] rounded-[2.5rem] overflow-hidden p-4 border-2 ring-1 ring-white/20">
                  <CardHeader className="pt-10 pb-6 text-center">
                    <div className="mx-auto w-16 h-16 bg-slate-900 rounded-3xl flex items-center justify-center mb-6 shadow-2xl shadow-slate-900/40 border border-slate-700">
                      <Lock className="text-white h-8 w-8" />
                    </div>
                    <CardTitle className="text-3xl font-black text-slate-900 tracking-tight">
                      {mfaStep === 'setup' ? 'Security Setup' : 'Verification'}
                    </CardTitle>
                    <CardDescription className="text-slate-500 font-bold px-6">
                      {mfaStep === 'setup' 
                        ? 'Scan the QR code with your Authenticator app.' 
                        : 'Enter your 6-digit verification code.'}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="px-8 pb-10">
                    {mfaStep === 'setup' && mfaData?.qrCode && (
                      <div className="flex justify-center mb-8 bg-white/50 p-6 rounded-[2rem] border border-white/50 shadow-inner backdrop-blur-md">
                        <img src={mfaData.qrCode} alt="QR Code" className="w-48 h-48 mix-blend-multiply" />
                      </div>
                    )}

                    <form onSubmit={handleMfaVerify} className="space-y-6">
                      <div className="space-y-2 text-center">
                        <Input
                          id="mfa-token"
                          type="text"
                          placeholder="000000"
                          className="h-16 rounded-2xl border-slate-200 bg-white/50 focus:ring-slate-900 text-center text-3xl font-black tracking-[0.6em] placeholder:text-slate-300"
                          value={mfaToken}
                          onChange={(e) => setMfaToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          required
                        />
                      </div>

                      <AnimatePresence>
                        {error && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                          >
                            <Alert variant="destructive" className="bg-rose-50/50 border-rose-100 text-rose-600 rounded-2xl border backdrop-blur-sm">
                              <AlertCircle className="h-4 w-4" />
                              <AlertDescription className="font-bold text-xs uppercase tracking-tight ml-2">{error}</AlertDescription>
                            </Alert>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <Button
                        type="submit"
                        disabled={isLoading || mfaToken.length < 6}
                        className="w-full h-14 rounded-2xl bg-slate-900 hover:bg-black font-black text-white shadow-2xl shadow-slate-900/40 transition-all active:scale-[0.98] uppercase tracking-widest"
                      >
                        {isLoading ? 'Verifying' : 'Continue'}
                      </Button>
                      
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setMfaStep('credentials')}
                        className="w-full h-12 rounded-xl text-slate-500 font-bold hover:bg-white/50 transition-colors"
                      >
                        BACK TO LOGIN
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Legal / Contact Branding */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-8 flex flex-col items-center gap-4"
          >
            <div className="flex items-center gap-3">
              <motion.div 
                whileHover={{ rotate: [0, -10, 10, 0] }}
                className="w-10 h-10 bg-amber-600 rounded-xl flex items-center justify-center shadow-xl shadow-amber-600/40"
              >
                <Truck size={22} className="text-white" />
              </motion.div>
              <span className="text-2xl font-black text-slate-900 md:text-slate-800 tracking-tighter uppercase italic drop-shadow-sm">
                Go<span className="text-[#f3bc2c]">Finance</span>
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em] opacity-80">
              Authorized Personnel Gateway
            </p>
          </motion.div>
        </div>
      </div>

      <PasswordResetOverlay 
        visible={resetOverlayVisible}
        userId={resetUserId}
        userRole={resetUserRole}
        onClose={() => setResetOverlayVisible(false)}
        onSuccess={() => {
          setResetOverlayVisible(false);
          alert("Password updated! Please login again with your new password.");
          window.location.reload();
        }}
      />
    </div>
  );
}
