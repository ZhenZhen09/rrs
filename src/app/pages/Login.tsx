import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Truck, AlertCircle, Lock, Mail, Eye, EyeOff } from 'lucide-react';

export function Login() {
  const navigate = useNavigate();
  const { login, user, isAuthenticated } = useAuth();

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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
        const newPassword = prompt("A password reset is required. Please enter a new password:");
        if (newPassword) {
          const updateResponse = await fetch('/api/auth/update-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: result.userId, newPassword })
          });
          
          if (updateResponse.ok) {
            alert("Password updated! Please login again with your new password.");
            window.location.reload();
          } else {
            setError("Failed to update password. Please try again.");
          }
        }
      } else if (result.mfa_required) {
        setMfaData({ userId: result.userId! });
        setMfaStep('verify');
      } else if (result.mfa_setup_required) {
        // Initialize setup
        const setupRes = await fetch('/api/auth/mfa/setup-init', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: result.userId })
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
        body: JSON.stringify(body)
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

  if (mfaStep === 'setup' || mfaStep === 'verify') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-none shadow-2xl shadow-slate-200/50 rounded-[2rem] overflow-hidden bg-white">
          <CardHeader className="pt-10 pb-6 text-center">
            <div className="mx-auto w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-slate-900/20">
              <Lock className="text-white h-8 w-8" />
            </div>
            <CardTitle className="text-3xl font-black text-slate-900 tracking-tight">
              {mfaStep === 'setup' ? 'Security Setup' : 'Verification'}
            </CardTitle>
            <CardDescription className="text-slate-500 font-medium px-6">
              {mfaStep === 'setup' 
                ? 'Scan the QR code with your Google Authenticator app and enter the 6-digit code below.' 
                : 'Enter the 6-digit code from your Google Authenticator app.'}
            </CardDescription>
          </CardHeader>

          <CardContent className="px-8 pb-10">
            {mfaStep === 'setup' && mfaData?.qrCode && (
              <div className="flex justify-center mb-8 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                <img src={mfaData.qrCode} alt="QR Code" className="w-48 h-48 mix-blend-multiply" />
              </div>
            )}

            <form onSubmit={handleMfaVerify} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="mfa-token" className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">
                  6-Digit Verification Code
                </Label>
                <Input
                  id="mfa-token"
                  type="text"
                  placeholder="000 000"
                  className="h-14 rounded-2xl border-slate-200 focus:ring-slate-900 focus:border-slate-900 text-center text-2xl font-black tracking-[0.5em]"
                  value={mfaToken}
                  onChange={(e) => setMfaToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                />
              </div>

              {error && (
                <Alert variant="destructive" className="bg-rose-50 border-rose-100 text-rose-600 rounded-2xl border">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="font-bold text-xs uppercase tracking-tight ml-2">{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                disabled={isLoading || mfaToken.length < 6}
                className="w-full h-14 rounded-2xl bg-slate-900 hover:bg-black font-black text-white shadow-xl shadow-slate-900/20 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {isLoading ? 'VERIFYING...' : 'VERIFY & CONTINUE'}
              </Button>
              
              <Button
                type="button"
                variant="ghost"
                onClick={() => setMfaStep('credentials')}
                className="w-full h-12 rounded-xl text-slate-500 font-bold hover:bg-slate-50"
              >
                BACK TO LOGIN
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#fdfcfb] font-sans overflow-hidden">
      {/* LEFT SIDE: Branding & Image Context */}
      <div className="relative flex-1 hidden md:flex flex-col justify-center px-12 lg:px-24 overflow-hidden">
        {/* Warehouse Background with Amber Overlay */}
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=2000" 
            alt="Logistics background" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-tr from-[#b45309]/90 via-[#d97706]/40 to-transparent" />
        </div>

        <div className="relative z-10 space-y-6 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full border border-white/30 mb-4">
            <Truck size={16} className="text-white" />
            <span className="text-white text-xs font-bold uppercase tracking-widest">Global Logistics</span>
          </div>
          
          <h1 className="text-5xl lg:text-6xl font-extrabold text-white leading-[1.1] tracking-tight">
            Your Trusted <br/>
            <span className="text-[#fef3c7]">Partner in Logistics.</span>
          </h1>
          
          <p className="text-amber-50 text-lg leading-relaxed opacity-90">
            At RSS, we ensure fast and reliable delivery services, 
            tailored to meet your needs with efficiency and care.
          </p>

          {/* Dynamic Light Trails (SVG Decor) */}
          <svg className="absolute -bottom-24 -left-12 opacity-30 w-[600px]" viewBox="0 0 400 200">
            <path d="M0,100 C100,50 300,150 400,100" stroke="white" strokeWidth="0.5" fill="none" className="animate-[dash_10s_linear_infinite]" />
            <path d="M0,120 C150,80 250,160 400,120" stroke="white" strokeWidth="0.5" fill="none" className="animate-[dash_8s_linear_infinite]" />
          </svg>
        </div>
      </div>

      {/* RIGHT SIDE: Login Interface */}
      <div className="flex-[0.8] lg:flex-[0.7] relative flex items-center justify-center p-6 bg-slate-50 md:bg-transparent">
        {/* Subtle background for mobile/tablet */}
        <div className="absolute inset-0 md:hidden bg-gradient-to-br from-amber-600 to-amber-800" />
        
        <div className="relative z-10 w-full max-w-md">
          {/* Mobile Brand Label */}
          <div className="md:hidden text-center mb-8">
            <h1 className="text-3xl font-black text-white italic tracking-tighter uppercase">RSS: Logistic App</h1>
          </div>

          <Card className="border-white/40 bg-white/70 backdrop-blur-2xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.15)] rounded-[2.5rem] p-4 border-2">
            <CardHeader className="space-y-1 text-center pt-8 pb-6">
              <CardTitle className="text-3xl font-bold tracking-tight text-slate-800">Sign in</CardTitle>
              <CardDescription className="text-slate-500 font-medium">
                Enter your gateway credentials
              </CardDescription>
            </CardHeader>

            <CardContent className="px-6 pb-10">
              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-2">
                  <div className="relative group">
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="E-mail"
                      className="bg-white border-slate-200 h-14 rounded-2xl px-4 text-slate-800 placeholder:text-slate-400 focus:ring-amber-500 focus:border-amber-500 transition-all shadow-sm"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="relative">
                    <Input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Password"
                      className="bg-white border-slate-200 h-14 rounded-2xl px-4 text-slate-800 placeholder:text-slate-400 focus:ring-amber-500 focus:border-amber-500 transition-all shadow-sm pr-12"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  <div className="flex justify-end px-1">
                    <button 
                      type="button"
                      onClick={() => alert("Please contact your administrator to reset your secure credentials.")}
                      className="text-xs font-semibold text-amber-700 hover:text-amber-800 transition-colors"
                    >
                      Forgot your password?
                    </button>
                  </div>
                </div>

                {error && (
                  <Alert className="bg-red-50 border-red-100 text-red-600 rounded-xl py-3 border">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-xs font-semibold">{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-4 pt-2">
                  <Button 
                    type="submit" 
                    disabled={isLoading}
                    className="w-full h-14 bg-[#ca8a04] hover:bg-[#b45309] text-white text-lg font-bold rounded-2xl transition-all shadow-lg shadow-amber-600/20 active:scale-[0.98]"
                  >
                    {isLoading ? "Verifying..." : "Login"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Legal / Contact Branding */}
          <div className="mt-8 flex flex-col items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-amber-600 rounded-lg flex items-center justify-center shadow-lg shadow-amber-600/30">
                <Truck size={18} className="text-white" />
              </div>
              <span className="text-xl font-black text-slate-800 md:text-slate-700 tracking-tighter uppercase italic">
                RSS: <span className="text-amber-600">Logistic App</span>
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">
              Authorized Logistics Personnel Gateway
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes dash {
          to {
            stroke-dashoffset: -1000;
          }
        }
      `}</style>
    </div>
  );
}
