import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Utensils, HeartHandshake, Building2, User, Mail, Lock, Phone, CheckCircle2, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [role, setRole] = useState<'provider' | 'ngo'>('provider');
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    organizationName: '',
    organizationType: 'restaurant',
    address: '',
    city: 'New Delhi',
    // NGO specific
    registrationNumber: '',
    maxMealsPerDay: 150,
    hasRefrigeration: true,
    hasWarmStorage: true,
    hasTransportFleet: false,
  });

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (name === 'maxMealsPerDay') {
      setFormData(prev => ({ ...prev, [name]: parseInt(value) || 0 }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Client-side validation
    if (formData.password.length < 6) {
      const msg = 'Password must be at least 6 characters long.';
      setError(msg);
      showToast('error', 'Validation Error', msg);
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        ...formData,
        role,
        organizationType: role === 'ngo' ? 'ngo_shelter' : formData.organizationType,
      };

      const user = await register(payload);
      showToast('success', 'Registration Successful!', `Welcome to FoodBridge, ${user.name}!`);

      if (user.role === 'provider') navigate('/provider/dashboard');
      else if (user.role === 'ngo') navigate('/ngo/dashboard');
      else navigate('/');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Registration failed. Please check the inputs.';
      setError(msg);
      showToast('error', 'Registration Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen pt-28 pb-16 px-4 flex items-center justify-center relative">
      <div className="max-w-xl w-full space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-forest-900 via-forest-800 to-emerald-500 flex items-center justify-center text-white mx-auto shadow-lg shadow-emerald-500/20">
            <Utensils className="w-6 h-6 text-lime-300" />
          </div>
          <h1 className="text-3xl font-display font-extrabold text-charcoal-900">Join FoodBridge</h1>
          <p className="text-sm text-charcoal-500">Create an account to start rescuing and redistributing food</p>
        </div>

        {/* Role Switcher - 2 Tabs (Food Provider & NGO / Shelter) */}
        <div className="flex p-1.5 rounded-2xl bg-charcoal-200/70 border border-charcoal-300/60 max-w-md mx-auto gap-2">
          <button
            type="button"
            onClick={() => {
              setRole('provider');
              setFormData(prev => ({ ...prev, organizationType: 'restaurant' }));
            }}
            className={`flex-1 py-3 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              role === 'provider' 
                ? 'bg-white text-forest-900 shadow-md ring-1 ring-charcoal-200/50' 
                : 'text-charcoal-600 hover:text-charcoal-900 hover:bg-white/40'
            }`}
          >
            <Building2 className="w-4 h-4 text-emerald-600" />
            <span>Food Provider</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setRole('ngo');
              setFormData(prev => ({ ...prev, organizationType: 'ngo_shelter' }));
            }}
            className={`flex-1 py-3 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              role === 'ngo' 
                ? 'bg-white text-forest-900 shadow-md ring-1 ring-charcoal-200/50' 
                : 'text-charcoal-600 hover:text-charcoal-900 hover:bg-white/40'
            }`}
          >
            <HeartHandshake className="w-4 h-4 text-emerald-600" />
            <span>NGO / Shelter</span>
          </button>
        </div>

        {/* Form Container */}
        <div className="glass-card rounded-2xl p-6 sm:p-8 border border-charcoal-200 shadow-md">
          {error && (
            <div className="mb-6 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* Account Credentials */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-charcoal-500">Account Manager</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">Full Name</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-charcoal-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Chef / Manager Name"
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-charcoal-200 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">Phone Number</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-charcoal-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      required
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="+91 98765 43210"
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-charcoal-200 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">Work Email</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-charcoal-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="contact@kitchen.org"
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-charcoal-200 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-charcoal-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="At least 6 characters"
                      className="w-full pl-9 pr-10 py-2 rounded-xl border border-charcoal-200 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-charcoal-400 hover:text-charcoal-700 transition-colors focus:outline-none p-1 rounded-lg"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Organization Info */}
            <div className="pt-4 border-t border-charcoal-100 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-charcoal-500">
                {role !== 'ngo' ? 'Food Facility / Kitchen Details' : 'NGO / Shelter Details'}
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">Organization Name</label>
                  <input
                    type="text"
                    required
                    name="organizationName"
                    value={formData.organizationName}
                    onChange={handleChange}
                    placeholder={role !== 'ngo' ? "e.g. Grand Spice Banquet" : "e.g. Hope Community Shelter"}
                    className="w-full px-3 py-2 rounded-xl border border-charcoal-200 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">Facility Type</label>
                  {role !== 'ngo' ? (
                    <select
                      name="organizationType"
                      value={formData.organizationType}
                      onChange={handleChange}
                      className="w-full px-3 py-2 rounded-xl border border-charcoal-200 text-sm bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    >
                      <option value="restaurant">Restaurant</option>
                      <option value="canteen">College / Office Canteen</option>
                      <option value="hotel">Hotel / Resort Buffet</option>
                      <option value="hostel">Student Hostel Mess</option>
                      <option value="caterer">Event Caterer & Banquet</option>
                    </select>
                  ) : (
                    <select
                      name="organizationType"
                      value={formData.organizationType}
                      onChange={handleChange}
                      className="w-full px-3 py-2 rounded-xl border border-charcoal-200 text-sm bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    >
                      <option value="ngo_shelter">Homeless / Orphanage Shelter</option>
                      <option value="community_kitchen">Community Soup Kitchen</option>
                      <option value="food_bank">Food Bank Network</option>
                      <option value="charity">Charity Foundation</option>
                    </select>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">Address</label>
                  <input
                    type="text"
                    required
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="Street, Landmark, Block"
                    className="w-full px-3 py-2 rounded-xl border border-charcoal-200 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">City</label>
                  <input
                    type="text"
                    required
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    placeholder="e.g. New Delhi"
                    className="w-full px-3 py-2 rounded-xl border border-charcoal-200 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* NGO Specific Verification Fields */}
              {role === 'ngo' && (
                <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200/80 space-y-3">
                  <div className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>NGO Intake & Verification Specifications</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-charcoal-700 mb-1">Registration / 80G Number</label>
                      <input
                        type="text"
                        name="registrationNumber"
                        value={formData.registrationNumber}
                        onChange={handleChange}
                        placeholder="NGO-REG-2024-XXXX"
                        className="w-full px-3 py-1.5 rounded-lg border border-charcoal-200 text-xs bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-charcoal-700 mb-1">Max Daily Meal Capacity</label>
                      <input
                        type="number"
                        name="maxMealsPerDay"
                        value={formData.maxMealsPerDay}
                        onChange={handleChange}
                        min="10"
                        className="w-full px-3 py-1.5 rounded-lg border border-charcoal-200 text-xs bg-white"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex flex-wrap gap-4 text-xs font-medium text-charcoal-800">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        name="hasRefrigeration"
                        checked={formData.hasRefrigeration}
                        onChange={handleChange}
                        className="rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>Equipped with Cold Storage / Fridge</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        name="hasTransportFleet"
                        checked={formData.hasTransportFleet}
                        onChange={handleChange}
                        className="rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>Has Pickup Vehicle / Van</span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-xl bg-forest-900 hover:bg-forest-800 text-white font-semibold text-sm shadow-md shadow-forest-900/20 transition-all flex items-center justify-center gap-2 disabled:opacity-70 mt-6"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Registering Organization...</span>
                </>
              ) : (
                <span>Complete Registration</span>
              )}
            </button>
          </form>

          <div className="mt-5 text-center text-xs text-charcoal-500">
            Already registered?{' '}
            <Link to="/login" className="font-semibold text-emerald-700 hover:underline">
              Sign In with existing account
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
};
