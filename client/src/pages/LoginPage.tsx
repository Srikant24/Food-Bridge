import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { 
  Utensils, 
  HeartHandshake, 
  ShieldCheck, 
  Lock, 
  Mail, 
  ArrowRight, 
  Sparkles, 
  AlertCircle, 
  Loader2, 
  Eye, 
  EyeOff,
  Building2,
  Info
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, demoLogin } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Active portal tab: 'provider' | 'ngo' | 'admin'
  const [activePortal, setActivePortal] = useState<'provider' | 'ngo' | 'admin'>('provider');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [demoRoleLoading, setDemoRoleLoading] = useState<string | null>(null);

  // Demo shortcut visibility is strictly limited to development/demo mode
  const isDemoEnvironment = import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEMO_LOGIN === 'true';

  const redirectByRole = (role: string) => {
    const canonical = (role === 'supplier' || role === 'food_provider') ? 'provider' : role;
    if (canonical === 'provider') navigate('/provider/dashboard');
    else if (canonical === 'ngo') navigate('/ngo/dashboard');
    else if (canonical === 'admin') navigate('/admin/dashboard');
    else navigate('/');
  };

  const handlePortalSwitch = (portal: 'provider' | 'ngo' | 'admin') => {
    setActivePortal(portal);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const user = await login({ email, password, portal: activePortal });
      showToast('success', 'Sign In Successful', `Welcome back, ${user.name}!`);
      redirectByRole(user.role);
    } catch (err: any) {
      const status = err.response?.status;
      const msg = err.response?.data?.message || 'Authentication failed. Please verify credentials.';
      setError(msg);
      showToast('error', status === 403 ? 'Access Denied' : 'Authentication Failed', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoClick = async (role: 'provider' | 'ngo' | 'admin') => {
    setError(null);
    setDemoRoleLoading(role);
    try {
      const user = await demoLogin(role);
      showToast('success', 'Demo Persona Authenticated', `Signed in as ${user.name} (${user.role.toUpperCase()})`);
      redirectByRole(user.role);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Demo authentication failed. Make sure the backend server is active.';
      setError(msg);
      showToast('error', 'Demo Error', msg);
    } finally {
      setDemoRoleLoading(null);
    }
  };

  // Portal specific metadata
  const portalMeta = {
    provider: {
      title: 'Food Provider Portal',
      subtitle: 'Manage food listings, incoming collection requests, pickup OTPs, and delivery statuses.',
      icon: <Building2 className="w-5 h-5 text-emerald-600" />,
      badge: 'Surplus Redistribution',
      targetRoute: '/provider/dashboard',
      accentColor: 'border-emerald-500 text-emerald-800 bg-emerald-50/50',
    },
    ngo: {
      title: 'NGO & Shelter Portal',
      subtitle: 'Browse available food surplus, request collections, and track scheduled pickups.',
      icon: <HeartHandshake className="w-5 h-5 text-emerald-600" />,
      badge: 'Food Intake & Relief',
      targetRoute: '/ngo/dashboard',
      accentColor: 'border-emerald-500 text-emerald-800 bg-emerald-50/50',
    },
    admin: {
      title: 'Administrator Portal',
      subtitle: 'Verify NGOs, review registrations, manage listings, and monitor platform operations.',
      icon: <ShieldCheck className="w-5 h-5 text-forest-900" />,
      badge: 'Operations & Governance',
      targetRoute: '/admin/dashboard',
      accentColor: 'border-forest-800 text-forest-900 bg-forest-50/50',
    },
  }[activePortal];

  return (
    <div className="min-h-screen pt-28 pb-16 px-4 flex items-center justify-center relative bg-cream-50">
      <div className="max-w-lg w-full space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-forest-900 via-forest-800 to-emerald-500 flex items-center justify-center text-white mx-auto shadow-lg shadow-emerald-500/20">
            <Utensils className="w-6 h-6 text-lime-300" />
          </div>
          <h1 className="text-3xl font-display font-extrabold text-charcoal-900">Sign In to FoodBridge</h1>
          <p className="text-sm text-charcoal-500">Select your account portal below to access your role-based dashboard</p>
        </div>

        {/* 3 Dedicated Login Portals (Provider, NGO / Shelter, Administrator) */}
        <div className="flex p-1.5 rounded-2xl bg-charcoal-200/70 border border-charcoal-300/60 gap-1.5 shadow-inner">
          <button
            type="button"
            onClick={() => handlePortalSwitch('provider')}
            className={`flex-1 py-2.5 px-2 rounded-xl text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer ${
              activePortal === 'provider'
                ? 'bg-white text-forest-900 shadow-md ring-1 ring-charcoal-200/50'
                : 'text-charcoal-600 hover:text-charcoal-900 hover:bg-white/40'
            }`}
          >
            <Building2 className={`w-4 h-4 ${activePortal === 'provider' ? 'text-emerald-600' : 'text-charcoal-400'}`} />
            <span>Food Provider</span>
          </button>

          <button
            type="button"
            onClick={() => handlePortalSwitch('ngo')}
            className={`flex-1 py-2.5 px-2 rounded-xl text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer ${
              activePortal === 'ngo'
                ? 'bg-white text-forest-900 shadow-md ring-1 ring-charcoal-200/50'
                : 'text-charcoal-600 hover:text-charcoal-900 hover:bg-white/40'
            }`}
          >
            <HeartHandshake className={`w-4 h-4 ${activePortal === 'ngo' ? 'text-emerald-600' : 'text-charcoal-400'}`} />
            <span>NGO / Shelter</span>
          </button>

          <button
            type="button"
            onClick={() => handlePortalSwitch('admin')}
            className={`flex-1 py-2.5 px-2 rounded-xl text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer ${
              activePortal === 'admin'
                ? 'bg-white text-forest-900 shadow-md ring-1 ring-charcoal-200/50'
                : 'text-charcoal-600 hover:text-charcoal-900 hover:bg-white/40'
            }`}
          >
            <ShieldCheck className={`w-4 h-4 ${activePortal === 'admin' ? 'text-forest-900' : 'text-charcoal-400'}`} />
            <span>Administrator</span>
          </button>
        </div>

        {/* Development & Demonstration Panel (Explicitly hidden in production) */}
        {isDemoEnvironment && (
          <div className="glass-card rounded-2xl p-4 sm:p-5 border border-emerald-300/80 shadow-md bg-gradient-to-b from-white to-emerald-50/40 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-900">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>Hackathon Demonstration: 1-Click Fast Login</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                Dev Environment
              </span>
            </div>
            
            <p className="text-xs text-charcoal-600">
              Select an active persona to immediately authenticate through the backend without typing credentials:
            </p>

            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={() => handleDemoClick('provider')}
                disabled={!!demoRoleLoading || submitting}
                className="w-full flex items-center justify-between p-2.5 rounded-xl bg-white border border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50/50 transition-all text-left text-xs font-medium shadow-sm group cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-forest-900 text-lime-300 flex items-center justify-center flex-shrink-0">
                    <Utensils className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="font-bold text-charcoal-900 group-hover:text-emerald-700">Food Provider (Chef Rajesh Sharma)</div>
                    <div className="text-[11px] text-charcoal-500">Grand Spice Banquet • Post surplus food & manage OTPs</div>
                  </div>
                </div>
                {demoRoleLoading === 'provider' ? (
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                ) : (
                  <ArrowRight className="w-4 h-4 text-charcoal-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-transform" />
                )}
              </button>

              <button
                type="button"
                onClick={() => handleDemoClick('ngo')}
                disabled={!!demoRoleLoading || submitting}
                className="w-full flex items-center justify-between p-2.5 rounded-xl bg-white border border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50/50 transition-all text-left text-xs font-medium shadow-sm group cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center flex-shrink-0">
                    <HeartHandshake className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="font-bold text-charcoal-900 group-hover:text-emerald-700">NGO Recipient (Priya Mehra)</div>
                    <div className="text-[11px] text-charcoal-500">Hope Community Shelter • Claim surplus & verify deliveries</div>
                  </div>
                </div>
                {demoRoleLoading === 'ngo' ? (
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                ) : (
                  <ArrowRight className="w-4 h-4 text-charcoal-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-transform" />
                )}
              </button>

              <button
                type="button"
                onClick={() => handleDemoClick('admin')}
                disabled={!!demoRoleLoading || submitting}
                className="w-full flex items-center justify-between p-2.5 rounded-xl bg-white border border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50/50 transition-all text-left text-xs font-medium shadow-sm group cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-charcoal-900 text-lime-400 flex items-center justify-center flex-shrink-0">
                    <ShieldCheck className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="font-bold text-charcoal-900 group-hover:text-emerald-700">Administrator (FoodBridge Operations)</div>
                    <div className="text-[11px] text-charcoal-500">Platform Governance • Verify NGOs & audit safety</div>
                  </div>
                </div>
                {demoRoleLoading === 'admin' ? (
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                ) : (
                  <ArrowRight className="w-4 h-4 text-charcoal-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-transform" />
                )}
              </button>
            </div>
          </div>
        )}

        {/* Portal-Specific Authentication Card */}
        <div className="glass-card bg-white rounded-2xl p-6 sm:p-8 border border-charcoal-200 shadow-md space-y-5">
          
          {/* Active Portal Header & Purpose */}
          <div className="pb-4 border-b border-charcoal-100 flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                {portalMeta.icon}
                <h2 className="text-lg font-bold text-charcoal-900">{portalMeta.title}</h2>
              </div>
              <p className="text-xs text-charcoal-600 leading-relaxed">
                {portalMeta.subtitle}
              </p>
            </div>
            <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-charcoal-100 text-charcoal-700 border border-charcoal-200/80 whitespace-nowrap">
              {portalMeta.badge}
            </span>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {activePortal === 'admin' && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-800 text-[11px] flex items-center gap-2">
              <Info className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>
                Restricted access: Only authorized administrators provisioned via environment configuration can sign in here.
              </span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-charcoal-700 mb-1.5">
                {activePortal === 'admin' ? 'Administrator Email' : 'Work Email Address'}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-charcoal-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={
                    activePortal === 'admin' 
                      ? 'admin@foodbridge.org' 
                      : activePortal === 'ngo' 
                      ? 'shelter@charity.org' 
                      : 'kitchen@restaurant.com'
                  }
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-charcoal-200 bg-white text-sm text-charcoal-900 placeholder:text-charcoal-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-charcoal-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-charcoal-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-11 py-2.5 rounded-xl border border-charcoal-200 bg-white text-sm text-charcoal-900 placeholder:text-charcoal-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-charcoal-400 hover:text-charcoal-700 transition-colors focus:outline-none p-1 rounded-lg cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-xl bg-forest-900 hover:bg-forest-800 text-white font-semibold text-sm shadow-md shadow-forest-900/20 transition-all flex items-center justify-center gap-2 disabled:opacity-70 active:scale-[0.99] cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In to {activePortal === 'provider' ? 'Food Provider' : activePortal === 'ngo' ? 'NGO / Shelter' : 'Admin'} Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Registration link for non-admins */}
          <div className="mt-5 text-center text-xs text-charcoal-500 pt-3 border-t border-charcoal-100">
            {activePortal === 'admin' ? (
              <span>Administrator accounts are provisioned exclusively via secure environment configuration.</span>
            ) : (
              <span>
                Don't have an account?{' '}
                <Link to="/register" className="font-semibold text-emerald-700 hover:underline">
                  Create Food Provider or NGO Account
                </Link>
              </span>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
