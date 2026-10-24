import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { 
  Menu, 
  X, 
  ArrowRight, 
  LogOut, 
  User, 
  Building2, 
  HeartHandshake, 
  ShieldCheck, 
  ChevronDown
} from 'lucide-react';
import { NotificationDropdown } from './NotificationDropdown';

interface NavbarProps {
  apiOnline?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ apiOnline: _apiOnline = true }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 15);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close menus on route change or Escape
  useEffect(() => {
    setMobileMenuOpen(false);
    setProfileDropdownOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
        setProfileDropdownOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getDashboardPath = () => {
    if (user?.role === 'provider') return '/provider/dashboard';
    if (user?.role === 'ngo') return '/ngo/dashboard';
    if (user?.role === 'admin') return '/admin/dashboard';
    return '/';
  };

  const getRoleIcon = () => {
    if (user?.role === 'provider') return <Building2 className="w-3.5 h-3.5 text-forest" />;
    if (user?.role === 'ngo') return <HeartHandshake className="w-3.5 h-3.5 text-apricot" />;
    if (user?.role === 'admin') return <ShieldCheck className="w-3.5 h-3.5 text-forest" />;
    return <User className="w-3.5 h-3.5" />;
  };

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const navLinks = [
    { path: '/', label: 'Home' },
    { path: '/#how-it-works', label: 'How It Works', isAnchor: true },
    { path: '/donations', label: 'Available Food' },
    { path: '/ngos', label: 'NGO Network' },
    { path: '/analytics', label: 'Our Impact' },
    { path: '/articles', label: 'Research & Data' },
    { path: '/about', label: 'About' },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <nav 
        className={`w-full transition-all duration-200 px-4 sm:px-8 py-3.5 flex items-center justify-between ${
          scrolled ? 'editorial-nav-scrolled' : 'editorial-nav'
        }`}
        aria-label="Main Navigation"
      >
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
          
          {/* Logo */}
          <Link 
            to="/" 
            className="flex items-center gap-2.5 group focus:outline-none focus:ring-2 focus:ring-forest/30 rounded-lg p-1" 
            aria-label="FoodBridge Home"
          >
            <div className="w-8 h-8 rounded-lg bg-forest text-white flex items-center justify-center font-serif text-lg font-bold shadow-xs">
              F
            </div>
            <div className="flex flex-col">
              <span className="font-serif text-xl sm:text-2xl text-darkink tracking-tight leading-none group-hover:text-forest transition-colors">
                FoodBridge
              </span>
              <span className="text-[10px] text-darkink/70 font-sans tracking-normal mt-0.5 hidden xs:inline">
                A better way to share
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden lg:flex items-center gap-6 text-[13px] font-medium text-darkink/75">
            {navLinks.map((item) => {
              const active = !item.isAnchor && isActive(item.path);

              return item.isAnchor ? (
                <a
                  key={item.label}
                  href={item.path}
                  className="hover:text-forest transition-colors py-1 relative"
                >
                  {item.label}
                </a>
              ) : (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`transition-colors py-1 relative ${
                    active ? 'text-darkink font-semibold' : 'hover:text-forest'
                  }`}
                >
                  {item.label}
                  {active && (
                    <motion.span
                      layoutId="editorial-nav-underline"
                      className="absolute -bottom-1 left-0 right-0 h-[2px] bg-apricot rounded-full"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                </Link>
              );
            })}

            {user && (
              <Link
                to={getDashboardPath()}
                className={`transition-colors py-1 relative font-semibold ${
                  isActive(getDashboardPath()) ? 'text-olive' : 'text-charcoal hover:text-olive'
                }`}
              >
                Dashboard
                {isActive(getDashboardPath()) && (
                  <motion.span
                    layoutId="editorial-nav-underline"
                    className="absolute -bottom-1 left-0 right-0 h-[2px] bg-olive rounded-full"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
              </Link>
            )}
          </div>

          {/* Right Action Buttons */}
          <div className="hidden sm:flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-2 relative">
                <NotificationDropdown />

                {/* Profile Toggle */}
                <div className="relative">
                  <button
                    onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-warmwhite border border-charcoal/15 hover:border-olive transition-all text-xs font-medium text-charcoal shadow-2xs cursor-pointer"
                  >
                    <div className="w-5 h-5 rounded-md bg-sage/60 flex items-center justify-center">
                      {getRoleIcon()}
                    </div>
                    <span className="max-w-[100px] truncate">{user.name.split(' ')[0]}</span>
                    <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-sage text-charcoal">
                      {user.role}
                    </span>
                    <ChevronDown className={`w-3.5 h-3.5 text-charcoal-400 transition-transform ${profileDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {profileDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 6 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 6 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-2 w-48 rounded-xl bg-warmwhite border border-charcoal/15 shadow-warm p-1.5 space-y-1 z-50 text-xs"
                      >
                        <div className="px-3 py-2 border-b border-charcoal/10">
                          <p className="font-bold text-charcoal truncate">{user.name}</p>
                          <p className="text-[10px] text-charcoal-500 truncate">{user.email}</p>
                        </div>

                        <Link
                          to={getDashboardPath()}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg text-charcoal hover:bg-cream hover:text-olive transition-colors font-medium"
                          onClick={() => setProfileDropdownOpen(false)}
                        >
                          <Building2 className="w-3.5 h-3.5 text-olive" />
                          <span>My Dashboard</span>
                        </Link>

                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-rose-700 hover:bg-rose-50 transition-colors font-medium text-left cursor-pointer"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>Sign Out</span>
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <Link 
                  to="/login"
                  className="px-3.5 py-2 text-xs font-semibold text-darkink/85 hover:text-forest transition-colors rounded-lg focus:outline-none focus:ring-2 focus:ring-forest/30"
                >
                  Sign In
                </Link>
                
                <Link 
                  to="/register"
                  className="inline-flex items-center gap-1.5 px-4.5 py-2 rounded-xl bg-forest hover:bg-forest-700 text-white font-bold text-xs shadow-sm hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-forest focus:ring-offset-2"
                >
                  <span className="text-white">Get Started</span>
                  <ArrowRight className="w-3.5 h-3.5 text-white" />
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Hamburger Button */}
          <div className="lg:hidden flex items-center gap-2">
            {user && (
              <div className="sm:hidden">
                <NotificationDropdown />
              </div>
            )}

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg border border-charcoal/15 text-charcoal-700 hover:bg-warmwhite transition-colors focus:outline-none cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5 text-charcoal" />}
            </button>
          </div>

        </div>
      </nav>

      {/* Mobile Slide-Over Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="lg:hidden bg-cream border-b border-charcoal/15 shadow-warm px-4 py-6 space-y-4"
          >
            <div className="flex flex-col space-y-2">
              {navLinks.map((item) => (
                item.isAnchor ? (
                  <a
                    key={item.label}
                    href={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-3 py-2 rounded-lg text-sm font-medium text-charcoal-700 hover:bg-sage/40 transition-colors"
                  >
                    {item.label}
                  </a>
                ) : (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive(item.path)
                        ? 'bg-sage/60 text-charcoal font-semibold'
                        : 'text-charcoal-700 hover:bg-sage/40'
                    }`}
                  >
                    {item.label}
                  </Link>
                )
              ))}

              {user && (
                <Link
                  to={getDashboardPath()}
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-lg text-sm font-bold text-olive hover:bg-sage/40 transition-colors"
                >
                  My Dashboard ({user.role})
                </Link>
              )}
            </div>

            <div className="pt-3 border-t border-charcoal/10 flex flex-col gap-2">
              {user ? (
                <button
                  onClick={() => { setMobileMenuOpen(false); handleLogout(); }}
                  className="w-full py-2.5 px-3 rounded-lg text-sm font-medium text-rose-700 hover:bg-rose-50 text-left flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full text-center py-2.5 rounded-lg border border-charcoal/20 text-sm font-medium text-charcoal hover:bg-warmwhite"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full text-center py-2.5 rounded-xl bg-forest text-white text-sm font-bold hover:bg-forest-700 shadow-sm transition-colors"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};
