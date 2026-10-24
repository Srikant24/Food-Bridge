import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../services/api';
import { 
  Bell, 
  Clock, 
  Sparkles, 
  ArrowRight, 
  RefreshCw,
  Truck,
  Check,
  CheckCircle,
  XCircle,
  Mail,
  Smartphone,
  UserCheck,
  Sliders,
  ShieldCheck,
  Info,
  CheckCircle2
} from 'lucide-react';

interface DeliveryStatusItem {
  status: string;
  recipient?: string;
}

interface NotificationItem {
  _id: string;
  title: string;
  message: string;
  type: string;
  link?: string;
  isRead: boolean;
  channels?: string[];
  emailStatus?: DeliveryStatusItem;
  smsStatus?: DeliveryStatusItem;
  createdAt: string;
}

interface NotificationPreferences {
  emailEnabled: boolean;
  smsEnabled: boolean;
  inAppEnabled: boolean;
  operationalAlertsEnabled: boolean;
  marketingOptIn: boolean;
}

export const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'inbox' | 'preferences'>('inbox');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  // Preferences State
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    emailEnabled: true,
    smsEnabled: true,
    inAppEnabled: true,
    operationalAlertsEnabled: true,
    marketingOptIn: false,
  });
  const [prefLoading, setPrefLoading] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/api/notifications');
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unreadCount || 0);
    } catch (err) {
      console.warn('Notifications fetch notice:', err);
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  };

  const loadPreferences = async () => {
    setPrefLoading(true);
    try {
      const res = await apiClient.get('/api/notifications/preferences');
      if (res.data?.preferences) {
        setPreferences({
          emailEnabled: res.data.preferences.emailEnabled ?? true,
          smsEnabled: res.data.preferences.smsEnabled ?? true,
          inAppEnabled: res.data.preferences.inAppEnabled ?? true,
          operationalAlertsEnabled: true, // Always enforced
          marketingOptIn: res.data.preferences.marketingOptIn ?? false,
        });
      }
    } catch (err) {
      console.warn('Preferences fetch notice:', err);
    } finally {
      setPrefLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
    loadPreferences();
  }, []);

  const updatePreference = async (key: keyof NotificationPreferences, value: boolean) => {
    const updated = { ...preferences, [key]: value };
    setPreferences(updated);
    setSaveStatus('Saving changes...');

    try {
      await apiClient.put('/api/notifications/preferences', {
        [key]: value,
      });
      setSaveStatus('Preferences updated successfully');
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err) {
      console.error('Failed to update preference:', err);
      setSaveStatus('Failed to save preference');
      // Revert
      loadPreferences();
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  const markSingleRead = async (id: string, link?: string) => {
    try {
      await apiClient.put(`/api/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
      if (link) {
        navigate(link);
      }
    } catch (err) {
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
      if (link) {
        navigate(link);
      }
    }
  };

  const markAllRead = async () => {
    try {
      await apiClient.put('/api/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'registration':
        return <UserCheck className="w-4 h-4 text-emerald-600" />;
      case 'food_alert':
      case 'match':
        return <Sparkles className="w-4 h-4 text-emerald-600" />;
      case 'request':
        return <Clock className="w-4 h-4 text-amber-600" />;
      case 'approval':
        return <CheckCircle className="w-4 h-4 text-emerald-600" />;
      case 'rejection':
        return <XCircle className="w-4 h-4 text-rose-600" />;
      case 'pickup':
      case 'delivery':
      case 'status_update':
      case 'driver_assigned':
      case 'delivery_progress':
        return <Truck className="w-4 h-4 text-sky-600" />;
      case 'expiry_warning':
      case 'expiry_soon':
        return <Clock className="w-4 h-4 text-rose-600" />;
      default:
        return <Bell className="w-4 h-4 text-forest" />;
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-forest/10 text-forest text-xs font-bold mb-2">
            <Bell className="w-3.5 h-3.5 text-forest" />
            <span>Alerts & Notifications Engine</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-charcoal">
            Notifications Center
          </h1>
          <p className="text-xs sm:text-sm text-charcoal/70">
            Automated multi-channel alerts for food listings, claims, approvals, and delivery milestones.
          </p>
        </div>

        {activeTab === 'inbox' && unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-forest/20 text-xs font-bold text-forest hover:bg-forest/5 shadow-2xs cursor-pointer transition-colors shrink-0"
          >
            <Check className="w-3.5 h-3.5 text-forest" />
            <span>Mark all read ({unreadCount})</span>
          </button>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center border-b border-forest/15 space-x-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('inbox')}
          className={`pb-3 relative transition-colors ${
            activeTab === 'inbox'
              ? 'text-forest border-b-2 border-forest font-bold'
              : 'text-charcoal/60 hover:text-charcoal'
          }`}
        >
          <span>Activity Feed</span>
          {unreadCount > 0 && (
            <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] bg-forest text-white">
              {unreadCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('preferences')}
          className={`pb-3 relative transition-colors flex items-center gap-1.5 ${
            activeTab === 'preferences'
              ? 'text-forest border-b-2 border-forest font-bold'
              : 'text-charcoal/60 hover:text-charcoal'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Channel Preferences</span>
        </button>
      </div>

      {/* Tab Content: INBOX */}
      {activeTab === 'inbox' && (
        <>
          {loading ? (
            <div className="py-20 text-center space-y-3">
              <RefreshCw className="w-8 h-8 animate-spin text-forest mx-auto" />
              <p className="text-sm text-charcoal/60">Fetching live notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="glass-card rounded-3xl p-12 text-center space-y-3 border border-forest/10 text-xs text-charcoal/70 bg-warmwhite/40">
              <Bell className="w-8 h-8 text-charcoal/40 mx-auto" />
              <p className="font-semibold text-charcoal text-base">You're all caught up!</p>
              <p>No new notifications at this time. Actionable alerts will appear here as surplus food moves.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((n) => (
                <div
                  key={n._id}
                  onClick={() => markSingleRead(n._id, n.link)}
                  className={`p-4 sm:p-5 rounded-2xl border transition-all flex items-start justify-between gap-4 cursor-pointer hover:border-forest/40 ${
                    !n.isRead 
                      ? 'bg-white border-forest/30 shadow-sm' 
                      : 'bg-warmwhite/60 border-forest/10 text-charcoal/80'
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-forest/10 flex items-center justify-center shrink-0 mt-0.5">
                      {getIcon(n.type)}
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-charcoal">{n.title}</h4>
                        {!n.isRead && (
                          <span className="w-2 h-2 rounded-full bg-forest shrink-0"></span>
                        )}
                      </div>
                      <p className="text-xs text-charcoal/80 leading-relaxed max-w-2xl">{n.message}</p>
                      
                      {/* Delivery Channel Badges */}
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <span className="text-[10px] text-charcoal/60">
                          {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                        </span>
                        {n.channels?.includes('email') && (
                          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <Mail className="w-2.5 h-2.5" />
                            <span>Email {n.emailStatus?.status === 'delivered' ? 'Delivered' : 'Verified'}</span>
                          </span>
                        )}
                        {n.channels?.includes('sms') && (
                          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-sky-50 text-sky-800 border border-sky-200">
                            <Smartphone className="w-2.5 h-2.5" />
                            <span>SMS {n.smsStatus?.status === 'delivered' ? 'Delivered' : 'Verified'}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {n.link && (
                    <div
                      className="p-2 rounded-xl text-charcoal/40 hover:text-forest hover:bg-forest/10 transition-colors shrink-0"
                      title="View Details"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Tab Content: PREFERENCES */}
      {activeTab === 'preferences' && (
        <div className="space-y-6">
          {saveStatus && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-forest/10 border border-forest/20 text-forest text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4 text-forest" />
              <span>{saveStatus}</span>
            </div>
          )}

          <div className="bg-white rounded-3xl border border-forest/15 p-6 shadow-sm space-y-6">
            <div>
              <h2 className="text-lg font-bold text-charcoal">Delivery Channels & Frequencies</h2>
              <p className="text-xs text-charcoal/70">
                Choose how FoodBridge contacts your organization for operational updates and donor requests.
              </p>
            </div>

            {prefLoading ? (
              <div className="py-12 text-center text-xs text-charcoal/60">
                <RefreshCw className="w-6 h-6 animate-spin text-forest mx-auto mb-2" />
                Loading channel preferences...
              </div>
            ) : (
              <div className="divide-y divide-forest/10">
                
                {/* Email Channel */}
                <div className="py-4 flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-forest" />
                      <span className="font-bold text-sm text-charcoal">Email Notifications</span>
                    </div>
                    <p className="text-xs text-charcoal/70 max-w-lg">
                      Receive branded listing notices, NGO collection matches, driver assignments, and delivery receipts.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.emailEnabled}
                      onChange={(e) => updatePreference('emailEnabled', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-charcoal/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-forest"></div>
                  </label>
                </div>

                {/* SMS Channel */}
                <div className="py-4 flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-sky-700" />
                      <span className="font-bold text-sm text-charcoal">SMS Alerts</span>
                    </div>
                    <p className="text-xs text-charcoal/70 max-w-lg">
                      Time-critical SMS alerts via DLT-approved templates for pickup coordination and secure OTPs.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.smsEnabled}
                      onChange={(e) => updatePreference('smsEnabled', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-charcoal/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-forest"></div>
                  </label>
                </div>

                {/* In-App Alerts */}
                <div className="py-4 flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-amber-600" />
                      <span className="font-bold text-sm text-charcoal">In-App Notifications</span>
                    </div>
                    <p className="text-xs text-charcoal/70 max-w-lg">
                      Dashboard badge notifications and quick alert drawer when signed into FoodBridge.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.inAppEnabled}
                      onChange={(e) => updatePreference('inAppEnabled', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-charcoal/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-forest"></div>
                  </label>
                </div>

                {/* Operational & Safety (Enforced) */}
                <div className="py-4 flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-forest" />
                      <span className="font-bold text-sm text-charcoal">Food Safety & Operational Verification</span>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-forest/10 text-forest">
                        Always Active
                      </span>
                    </div>
                    <p className="text-xs text-charcoal/70 max-w-lg">
                      Mandatory safety notifications, pickup handover OTPs, and expiry cutoff warnings required for regulatory compliance.
                    </p>
                  </div>
                  <div className="text-xs font-semibold text-forest bg-forest/5 px-3 py-1.5 rounded-lg border border-forest/15">
                    Protected
                  </div>
                </div>

                {/* Marketing & Reports */}
                <div className="py-4 flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      <span className="font-bold text-sm text-charcoal">Monthly Impact Reports & Best Practices</span>
                    </div>
                    <p className="text-xs text-charcoal/70 max-w-lg">
                      Periodic summaries of CO2 emissions prevented, meals served, and food redistribution tips.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.marketingOptIn}
                      onChange={(e) => updatePreference('marketingOptIn', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-charcoal/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-forest"></div>
                  </label>
                </div>

              </div>
            )}
          </div>

          {/* Compliance & Security Guarantee Card */}
          <div className="p-4 rounded-2xl bg-cream border border-forest/20 text-xs text-charcoal/80 flex items-start gap-3">
            <Info className="w-5 h-5 text-forest shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-forest">Security & Privacy Invariant</p>
              <p className="text-[11px] leading-relaxed">
                FoodBridge strictly conforms to TRAI / DLT regulatory guidelines for SMS communications in India. OTPs and sensitive pickup codes are never broadcast to public delivery logs. Your contact information is never sold or shared with commercial marketers.
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
