import React from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, ArrowLeft, Loader2, Building2, HeartHandshake, ShieldCheck } from 'lucide-react';

import { type UserRole } from '../services/api';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, token, loading } = useAuth();
  const location = useLocation();

  // 1. Session restoration / initial loading state
  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mx-auto" />
          <p className="text-xs font-semibold text-charcoal-500 uppercase tracking-wider">
            Authenticating Session...
          </p>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated user: redirect to login with return path
  if (!token || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 3. Role authorization check using normalized canonical role
  const normalizedUserRole = (user.role?.toLowerCase() === 'supplier' || user.role?.toLowerCase() === 'food_provider')
    ? 'provider'
    : (user.role?.toLowerCase() as UserRole);

  const isAuthorized = !allowedRoles || allowedRoles.includes(normalizedUserRole);

  if (!isAuthorized) {
    const getRoleDashboardPath = (role: string) => {
      const canonical = role?.toLowerCase() === 'supplier' ? 'provider' : role?.toLowerCase();
      if (canonical === 'provider') return '/provider/dashboard';
      if (canonical === 'ngo') return '/ngo/dashboard';
      if (canonical === 'admin') return '/admin/dashboard';
      return '/';
    };

    const getRoleBadge = (role: string) => {
      const canonical = role?.toLowerCase() === 'supplier' ? 'provider' : role?.toLowerCase();
      if (canonical === 'provider') return <span className="inline-flex items-center gap-1 text-emerald-800"><Building2 className="w-3.5 h-3.5" /> Food Provider</span>;
      if (canonical === 'ngo') return <span className="inline-flex items-center gap-1 text-emerald-800"><HeartHandshake className="w-3.5 h-3.5" /> NGO / Recipient</span>;
      if (canonical === 'admin') return <span className="inline-flex items-center gap-1 text-forest-900"><ShieldCheck className="w-3.5 h-3.5" /> Administrator</span>;
      return role;
    };

    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
        <div className="glass-card rounded-3xl p-8 max-w-md w-full text-center space-y-5 border border-rose-200 shadow-xl bg-gradient-to-b from-white to-rose-50/20">
          <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-sm">
            <ShieldAlert className="w-7 h-7" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold font-display text-charcoal-900">
              Access Restricted
            </h2>
            <p className="text-xs text-charcoal-600 leading-relaxed">
              This portal requires an authorized role of{' '}
              <strong className="text-rose-700 uppercase font-mono">
                {allowedRoles.join(' or ')}
              </strong>.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-offwhite border border-charcoal-200 text-xs text-charcoal-700 space-y-1">
            <div className="text-[11px] uppercase tracking-wider text-charcoal-400 font-bold">Currently Signed In As</div>
            <div className="font-bold text-sm text-charcoal-900">{user.name}</div>
            <div className="text-xs">{getRoleBadge(user.role)}</div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <Link
              to={getRoleDashboardPath(user.role)}
              className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-forest-900 hover:bg-forest-800 text-white font-semibold text-xs shadow-md transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Go to Your Dashboard</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 4. Authorized: render requested protected component
  return <>{children}</>;
};
