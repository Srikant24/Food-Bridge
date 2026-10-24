import React from 'react';

export const CardSkeleton: React.FC = () => (
  <div className="glass-card rounded-2xl p-6 border border-charcoal-200/80 shadow-xs space-y-4 animate-pulse">
    <div className="flex items-center justify-between">
      <div className="h-4 w-24 bg-charcoal-200 rounded-md"></div>
      <div className="h-5 w-20 bg-charcoal-200 rounded-full"></div>
    </div>
    <div className="space-y-2">
      <div className="h-5 w-3/4 bg-charcoal-200 rounded-md"></div>
      <div className="h-3 w-full bg-charcoal-100 rounded-md"></div>
    </div>
    <div className="py-2.5 border-y border-charcoal-100 grid grid-cols-2 gap-2">
      <div className="h-4 w-28 bg-charcoal-200 rounded"></div>
      <div className="h-4 w-20 bg-charcoal-200 rounded"></div>
    </div>
    <div className="h-9 w-full bg-charcoal-200 rounded-xl"></div>
  </div>
);

export const StatCardSkeleton: React.FC = () => (
  <div className="glass-card p-5 rounded-2xl border border-charcoal-200 animate-pulse space-y-2">
    <div className="h-3 w-20 bg-charcoal-200 rounded"></div>
    <div className="h-8 w-16 bg-charcoal-300 rounded-md"></div>
    <div className="h-3 w-28 bg-charcoal-100 rounded"></div>
  </div>
);

export const TableRowSkeleton: React.FC = () => (
  <div className="p-4 rounded-xl border border-charcoal-100 bg-white animate-pulse flex items-center justify-between gap-4">
    <div className="space-y-2 flex-1">
      <div className="h-4 w-40 bg-charcoal-200 rounded"></div>
      <div className="h-3 w-64 bg-charcoal-100 rounded"></div>
    </div>
    <div className="h-7 w-20 bg-charcoal-200 rounded-lg"></div>
  </div>
);

export const DetailSkeleton: React.FC = () => (
  <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8 animate-pulse">
    <div className="flex items-center gap-3">
      <div className="h-8 w-24 bg-charcoal-200 rounded-xl"></div>
      <div className="h-6 w-32 bg-charcoal-100 rounded-full"></div>
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6">
        <div className="glass-card rounded-3xl p-6 sm:p-8 space-y-4">
          <div className="h-8 w-3/4 bg-charcoal-200 rounded-xl"></div>
          <div className="h-4 w-full bg-charcoal-100 rounded"></div>
          <div className="h-4 w-2/3 bg-charcoal-100 rounded"></div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-charcoal-100">
            <div className="h-16 bg-charcoal-100 rounded-xl"></div>
            <div className="h-16 bg-charcoal-100 rounded-xl"></div>
            <div className="h-16 bg-charcoal-100 rounded-xl"></div>
            <div className="h-16 bg-charcoal-100 rounded-xl"></div>
          </div>
        </div>
        <div className="glass-card rounded-3xl p-6 space-y-4">
          <div className="h-6 w-48 bg-charcoal-200 rounded-lg"></div>
          <div className="h-32 bg-charcoal-100 rounded-2xl"></div>
        </div>
      </div>
      <div className="space-y-6">
        <div className="glass-card rounded-3xl p-6 space-y-4">
          <div className="h-6 w-36 bg-charcoal-200 rounded-lg"></div>
          <div className="h-24 bg-charcoal-100 rounded-2xl"></div>
          <div className="h-12 bg-charcoal-200 rounded-xl"></div>
        </div>
      </div>
    </div>
  </div>
);
