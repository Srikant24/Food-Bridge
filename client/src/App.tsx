import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ScrollToTop } from './components/ScrollToTop';
import { PageTransition } from './components/PageTransition';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ProviderDashboard } from './pages/ProviderDashboard';
import { CreateDonationPage } from './pages/CreateDonationPage';
import { AvailableDonationsPage } from './pages/AvailableDonationsPage';
import { DonationDetailsPage } from './pages/DonationDetailsPage';
import { NgoDashboard } from './pages/NgoDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { NgoDirectoryPage } from './pages/NgoDirectoryPage';
import { ImpactAnalyticsPage } from './pages/ImpactAnalyticsPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { AboutPage } from './pages/AboutPage';
import { ArticlesPage } from './pages/ArticlesPage';
import { FoodBridgeChatbot } from './components/FoodBridgeChatbot';
import { fetchHealthCheck } from './services/api';

const AnimatedRoutes: React.FC = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageTransition><LandingPage /></PageTransition>} />
        <Route path="/login" element={<PageTransition><LoginPage /></PageTransition>} />
        <Route path="/register" element={<PageTransition><RegisterPage /></PageTransition>} />

        {/* Donations */}
        <Route path="/donations" element={<PageTransition><AvailableDonationsPage /></PageTransition>} />
        <Route
          path="/donations/create"
          element={
            <ProtectedRoute allowedRoles={['provider', 'admin']}>
              <PageTransition><CreateDonationPage /></PageTransition>
            </ProtectedRoute>
          }
        />
        <Route path="/donations/:id" element={<PageTransition><DonationDetailsPage /></PageTransition>} />

        {/* Role Dashboards with ProtectedRoute & Canonical /dashboard Paths */}
        <Route
          path="/provider/dashboard"
          element={
            <ProtectedRoute allowedRoles={['provider']}>
              <PageTransition><ProviderDashboard /></PageTransition>
            </ProtectedRoute>
          }
        />
        <Route path="/provider" element={<Navigate to="/provider/dashboard" replace />} />

        <Route
          path="/ngo/dashboard"
          element={
            <ProtectedRoute allowedRoles={['ngo']}>
              <PageTransition><NgoDashboard /></PageTransition>
            </ProtectedRoute>
          }
        />
        <Route path="/ngo" element={<Navigate to="/ngo/dashboard" replace />} />

        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <PageTransition><AdminDashboard /></PageTransition>
            </ProtectedRoute>
          }
        />
        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />

        {/* Discovery, Analytics & Safety */}
        <Route path="/ngos" element={<PageTransition><NgoDirectoryPage /></PageTransition>} />
        <Route path="/analytics" element={<PageTransition><ImpactAnalyticsPage /></PageTransition>} />
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <PageTransition><NotificationsPage /></PageTransition>
            </ProtectedRoute>
          }
        />
        <Route path="/about" element={<PageTransition><AboutPage /></PageTransition>} />
        <Route path="/articles" element={<PageTransition><ArticlesPage /></PageTransition>} />

        {/* 404 Not Found */}
        <Route
          path="*"
          element={
            <PageTransition>
              <div className="min-h-[70vh] flex items-center justify-center px-4 text-center">
                <div className="space-y-4">
                  <h2 className="text-4xl font-extrabold text-charcoal-900">404 - Page Not Found</h2>
                  <p className="text-charcoal-600">The requested FoodBridge route does not exist.</p>
                  <Link to="/" className="inline-block px-5 py-2.5 bg-forest-900 text-white rounded-xl text-sm font-semibold shadow-md hover:bg-forest-800 transition-colors">
                    Return Home
                  </Link>
                </div>
              </div>
            </PageTransition>
          }
        />
      </Routes>
    </AnimatePresence>
  );
};

const MainLayout: React.FC = () => {
  const [apiOnline, setApiOnline] = useState<boolean>(true);

  useEffect(() => {
    fetchHealthCheck()
      .then(() => setApiOnline(true))
      .catch(() => setApiOnline(false));
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-offwhite font-sans text-charcoal selection:bg-emerald-200 selection:text-forest-900">
      <ScrollToTop />
      <Navbar apiOnline={apiOnline} />

      <main id="main-content" className="flex-grow pt-20">
        <AnimatedRoutes />
      </main>

      {/* Floating AI Assistant available globally */}
      <FoodBridgeChatbot />

      <Footer />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <ToastProvider>
          <MainLayout />
        </ToastProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;
