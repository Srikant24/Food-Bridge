import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiClient } from '../services/api';
import { 
  Bell, 
  Check, 
  CheckCheck, 
  ExternalLink, 
  Loader2, 
  Sparkles, 
  Truck, 
  AlertTriangle, 
  Utensils, 
  HeartHandshake 
} from 'lucide-react';

interface NotificationItem {
  _id: string;
  title: string;
  message: string;
  type: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

export const NotificationDropdown: React.FC = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchSummary = async () => {
    try {
      const res = await apiClient.get('/api/notifications');
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unreadCount || 0);
    } catch (err) {
      // Quiet fail if not authenticated
    }
  };

  useEffect(() => {
    fetchSummary();
    const interval = setInterval(fetchSummary, 30000); // Polling every 30s
    const handleCustomRefresh = () => {
      fetchSummary();
    };
    window.addEventListener('foodbridge:refresh:notifications', handleCustomRefresh);
    return () => {
      clearInterval(interval);
      window.removeEventListener('foodbridge:refresh:notifications', handleCustomRefresh);
    };
  }, []);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = () => {
    if (!isOpen) {
      setLoading(true);
      fetchSummary().finally(() => setLoading(false));
    }
    setIsOpen(!isOpen);
  };

  const markAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await apiClient.put(`/api/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.warn('Failed to mark read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await apiClient.put('/api/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.warn('Failed to mark all read:', err);
    }
  };

  const handleItemClick = (notification: NotificationItem) => {
    if (!notification.isRead) {
      markAsRead(notification._id);
    }
    setIsOpen(false);
    if (notification.link) {
      navigate(notification.link);
    } else {
      navigate('/notifications');
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'food_alert':
        return <Utensils className="w-3.5 h-3.5 text-emerald-700" />;
      case 'approval':
        return <Check className="w-3.5 h-3.5 text-emerald-600" />;
      case 'request':
        return <HeartHandshake className="w-3.5 h-3.5 text-terracotta" />;
      case 'pickup':
      case 'driver_assigned':
      case 'delivery':
        return <Truck className="w-3.5 h-3.5 text-forest-800" />;
      case 'expiry_warning':
      case 'expiry_soon':
        return <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />;
      default:
        return <Sparkles className="w-3.5 h-3.5 text-forest-700" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={handleToggle}
        className="p-2 rounded-lg border border-charcoal/15 hover:bg-cream text-charcoal-600 transition-colors relative cursor-pointer"
        title="Notifications"
        aria-label="View notifications"
        aria-expanded={isOpen}
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-terracotta text-white font-bold text-[10px] flex items-center justify-center absolute -top-1 -right-1 ring-2 ring-cream shadow-xs animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-warmwhite border border-charcoal/15 shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="p-3.5 bg-cream/70 border-b border-charcoal/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs text-forest-900 tracking-wide uppercase">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-terracotta/15 text-terracotta font-extrabold text-[10px]">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-[11px] font-semibold text-emerald-800 hover:text-forest-900 flex items-center gap-1 cursor-pointer"
              >
                <CheckCheck className="w-3 h-3" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* List Content */}
          <div className="max-h-80 overflow-y-auto divide-y divide-charcoal/5">
            {loading ? (
              <div className="p-8 text-center text-charcoal-400">
                <Loader2 className="w-5 h-5 animate-spin mx-auto text-emerald-600 mb-2" />
                <span className="text-xs">Loading alerts...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-charcoal-500 space-y-1">
                <Bell className="w-6 h-6 text-charcoal-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-charcoal-700">All caught up!</p>
                <p className="text-[11px] text-charcoal-400">No recent notifications found.</p>
              </div>
            ) : (
              notifications.slice(0, 5).map((item) => (
                <div
                  key={item._id}
                  onClick={() => handleItemClick(item)}
                  className={`p-3 text-left transition-colors cursor-pointer flex gap-3 hover:bg-cream/40 ${
                    !item.isRead ? 'bg-cream/20' : ''
                  }`}
                >
                  <div className="w-7 h-7 rounded-lg bg-sage/40 flex-shrink-0 flex items-center justify-center mt-0.5">
                    {getNotificationIcon(item.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <p className={`text-xs truncate ${!item.isRead ? 'font-bold text-forest-900' : 'font-semibold text-charcoal-800'}`}>
                        {item.title}
                      </p>
                      {!item.isRead && (
                        <span className="w-1.5 h-1.5 rounded-full bg-terracotta flex-shrink-0"></span>
                      )}
                    </div>
                    <p className="text-[11px] text-charcoal-600 line-clamp-2 leading-relaxed">
                      {item.message}
                    </p>
                    <div className="flex items-center justify-between mt-1 text-[10px] text-charcoal-400">
                      <span>{new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {!item.isRead && (
                        <button
                          onClick={(e) => markAsRead(item._id, e)}
                          className="text-emerald-700 hover:text-emerald-900 font-medium"
                        >
                          Mark read
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer View All */}
          <div className="p-2.5 bg-warmwhite border-t border-charcoal/10 text-center">
            <Link
              to="/notifications"
              onClick={() => setIsOpen(false)}
              className="text-xs font-bold text-forest-900 hover:text-terracotta transition-colors inline-flex items-center gap-1.5"
            >
              <span>View all notifications</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
