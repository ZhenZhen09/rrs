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
import { PasswordResetOverlay } from '../components/PasswordResetOverlay';
import { getRoleHomeRoute } from '../utils/roleRoutes';

export function Login() {
  const navigate = useNavigate();
  const { login, user, isAuthenticated } = useAuth();

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Password Reset States
  const [resetOverlayVisible, setResetOverlayVisible] = useState(false);
  const [resetChallenge, setResetChallenge] = useState('');
  const [resetUserRole, setResetUserRole] = useState('');

  // MFA States
  const [mfaStep, setMfaStep] = useState<'credentials' | 'setup' | 'verify'>('credentials');
  const [mfaData, setMfaData] = useState<{ challenge: string; qrCode?: string } | null>(null);
  const [mfaToken, setMfaToken] = useState('');

  // Auto-redirect if already logged in
  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(getRoleHomeRoute(user.role), { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await login(loginEmail.trim(), loginPassword, rememberMe);
      
      if (result.success) {
        // Success: useEffect will handle redirection
      } else if (result.requirePasswordReset) {
        setResetChallenge(result.challenge || '');
        setResetUserRole(result.role || '');
        setResetOverlayVisible(true);
      } else if (result.mfa_required) {
        setMfaData({ challenge: result.challenge! });
        setMfaStep('verify');
      } else if (result.mfa_setup_required) {
        // Initialize setup
        const setupRes = await fetch('/api/auth/mfa/setup-init', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ challenge: result.challenge }),
          credentials: 'include'
        });
        if (setupRes.ok) {
          const setupData = await setupRes.json();
          setMfaData({ challenge: setupData.challenge, qrCode: setupData.qrCode });
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
      const body = { challenge: mfaData?.challenge, token: mfaToken, rememberMe };

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
        
        localStorage.removeItem('currentUser');
        localStorage.removeItem('rememberedUser');
        sessionStorage.removeItem('sessionUser');
        (rememberMe ? localStorage : sessionStorage).setItem(
          rememberMe ? 'rememberedUser' : 'sessionUser',
          JSON.stringify(userToSet)
        );
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
    <div className="min-h-screen flex flex-col md:flex-row bg-[#f6f3ee] font-sans overflow-hidden">
      {/* LEFT SIDE: Branding & Image Context */}
      <div className="relative hidden flex-1 flex-col justify-end overflow-hidden px-8 pb-10 md:flex lg:flex-[1.35] lg:px-12 lg:pb-14 xl:px-16">
        <div className="absolute inset-0 z-0">
          <motion.img
            src="https://images.squarespace-cdn.com/content/v1/604b1fff436e397a99d573e9/149361b1-46af-4f99-9c18-016e5aa06c44/DSCF1313.jpg" 
            alt="Rider scheduling scene" 
            initial={{ scale: 1.06 }}
            animate={{ scale: 1 }}
            transition={{ duration: 1.8, ease: "easeOut" }}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#071a3b]/90 via-[#071a3b]/15 to-[#071a3b]/5" />
          <div className="absolute inset-0 bg-gradient-to-tr from-[#f3bc2c]/25 via-transparent to-transparent" />
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="relative z-10 flex max-w-2xl -translate-y-16 flex-col items-start gap-5 lg:-translate-y-24"
        >
          <div>
            <h1 className="font-[Newsreader] text-5xl font-black leading-[0.82] tracking-[-0.06em] text-[#071a3b] drop-shadow-sm lg:text-7xl">
              ERRANDS.
            </h1>
            <div className="mt-5 flex items-center gap-3">
              <div className="h-1 w-12 rounded-full bg-[#f3bc2c]" />
              <p className="text-xs font-black uppercase tracking-[0.3em] text-white/90 lg:text-sm">
                Collection Simplified
              </p>
            </div>
          </div>
          <div className="max-w-md translate-y-16 border-l-2 border-[#f3bc2c] pl-5 text-white/90 lg:translate-y-24">
            <p className="font-[Newsreader] text-lg leading-tight lg:text-xl">People. Processes. Delivering more every day.</p>
            <p className="mt-2 text-[11px] leading-4 text-white/65 lg:text-xs">A streamlined platform for our people to keep operations moving forward.</p>
          </div>
        </motion.div>
      </div>

      {/* RIGHT SIDE: Interfaces */}
      <div className="relative flex min-h-[100dvh] flex-[0.8] items-center justify-center overflow-y-auto bg-[#f6f3ee] p-3 sm:p-4 md:min-h-0 md:overflow-hidden md:flex lg:flex-[0.7]">
        <div className="absolute inset-0 md:hidden">
          <img
            src="https://images.squarespace-cdn.com/content/v1/604b1fff436e397a99d573e9/149361b1-46af-4f99-9c18-016e5aa06c44/DSCF1313.jpg"
            alt=""
            aria-hidden="true"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#071a3b]/85 via-[#071a3b]/55 to-[#071a3b]/90" />
        </div>
        
        <div className="relative z-10 w-full max-w-sm">
          <AnimatePresence mode="wait">
            {mfaStep === 'credentials' ? (
              <motion.div
                key="login-step"
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -20 }}
                transition={{ duration: 0.4, ease: "circOut" }}
              >
                <div className="mb-5 text-center md:hidden">
                  <h1 className="font-[Newsreader] text-4xl font-black tracking-tight text-white">ERRANDS.</h1>
                  <p className="mt-2 text-[10px] font-black uppercase tracking-[0.3em] text-white/70">Collection Simplified</p>
                </div>

                <Card className="rounded-[1.75rem] border border-white/80 bg-white p-2 shadow-[0_24px_70px_-24px_rgba(7,26,59,0.35)] sm:p-3">
                  <CardHeader className="space-y-1 text-center pt-5 pb-3">
                    <CardTitle className="font-[Newsreader] text-3xl font-black tracking-tight text-[#071a3b]">Sign in</CardTitle>
                    <div className="mx-auto mt-3 h-1 w-12 rounded-full bg-[#f3bc2c]" />
                    <CardDescription className="pt-2 text-[10px] font-black uppercase tracking-[0.25em] text-[#8291b0]">
                      Authorized Personnel Gateway
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="px-4 pb-5 sm:px-5 sm:pb-6">
                    <form onSubmit={handleLogin} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="login-email" className="mb-2 block text-left text-sm font-semibold text-[#172b4d]">Email address</Label>
                        <div className="relative group">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-amber-600 transition-colors" size={20} />
                          <Input
                            id="login-email"
                            type="email"
                            placeholder="Email address"
                            className="h-11 rounded-2xl border-[#dce2ec] bg-white pl-12 pr-4 text-slate-800 shadow-sm transition-all focus:border-[#d98a0b] focus:ring-2 focus:ring-[#f3bc2c]/20"
                            value={loginEmail}
                            onChange={(e) => setLoginEmail(e.target.value)}
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="login-password" className="mb-2 block text-left text-sm font-semibold text-[#172b4d]">Password</Label>
                        <div className="relative group">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-amber-600 transition-colors" size={20} />
                          <Input
                            id="login-password"
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Password"
                            className="h-11 rounded-2xl border-[#dce2ec] bg-white pl-12 pr-12 text-slate-800 shadow-sm transition-all focus:border-[#d98a0b] focus:ring-2 focus:ring-[#f3bc2c]/20"
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
                            className="text-xs font-bold text-[#d2670b] transition-colors hover:text-[#a94d08]"
                          >
                            Forgot password?
                          </button>
                        </div>
                        <label className="flex items-center gap-2 px-1 text-xs font-semibold text-[#53627a]">
                          <input
                            type="checkbox"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            className="h-4 w-4 rounded border-slate-300 accent-[#d98a0b]"
                          />
                          Keep me signed in on this device
                        </label>
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
                          className="h-11 w-full rounded-2xl border-none bg-gradient-to-r from-[#f0a000] to-[#c95d00] text-sm font-black text-white shadow-xl shadow-[#d56f0b]/25 transition-all hover:from-[#e28f00] hover:to-[#b95000] active:scale-[0.98]"
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
                <Card className="w-full max-w-sm overflow-hidden rounded-[1.75rem] border border-white/80 bg-white p-3 shadow-[0_24px_70px_-24px_rgba(7,26,59,0.35)]">
                  <CardHeader className="pt-10 pb-6 text-center">
                    <div className="mx-auto w-16 h-16 bg-slate-900 rounded-3xl flex items-center justify-center mb-6 shadow-2xl shadow-slate-900/40 border border-slate-700">
                      <Lock className="text-white h-8 w-8" />
                    </div>
                    <CardTitle className="text-2xl font-black text-slate-900 tracking-tight">
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
            className="mt-5 hidden flex-col items-center gap-3 md:flex"
          >
            <div className="flex items-center gap-3">
              <motion.div 
                whileHover={{ rotate: [0, -10, 10, 0] }}
                className="w-10 h-10 bg-amber-600 rounded-xl flex items-center justify-center shadow-xl shadow-amber-600/40"
              >
                <Truck size={22} className="text-white" />
              </motion.div>
              <span className="font-[Newsreader] text-3xl font-black tracking-tight text-[#071a3b]">
                ERRANDS.
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
        challenge={resetChallenge}
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
