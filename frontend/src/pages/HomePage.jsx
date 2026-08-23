import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ClipboardList, CheckCircle2, Clock, Activity, ArrowRight } from 'lucide-react';

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div className="max-w-7xl mx-auto space-y-8 p-2">
      {/* Welcome Header */}
      <div 
        className="rounded-2xl p-8 text-white shadow-lg relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6"
        style={{ backgroundColor: '#962c30' }}
      >
        <div className="space-y-2 z-10">
          <span 
            className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full text-gray-900"
            style={{ backgroundColor: '#ffc20a' }}
          >
            System Portal
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight">
            Welcome back, {user?.name || 'User'}
          </h1>
          <p className="text-amber-100/80 text-sm max-w-xl">
            Monitor implementation progress, review key milestones, and manage project deliverables effectively.
          </p>
        </div>

        <Link
          to="/implementation-plan"
          className="z-10 px-5 py-3 rounded-xl font-bold text-sm shadow-md flex items-center gap-2 hover:opacity-95 transition-all text-white"
          style={{ backgroundColor: '#068737' }}
        >
          View Implementation Plan
          <ArrowRight size={18} />
        </Link>

        {/* Decorative Circles */}
        <div 
          className="absolute -right-10 -bottom-10 w-48 h-48 rounded-full opacity-10 pointer-events-none"
          style={{ backgroundColor: '#ffc20a' }}
        ></div>
      </div>

      {/* KPI Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 rounded-lg" style={{ backgroundColor: '#962c30', color: '#ffffff' }}>
            <ClipboardList size={28} />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Activities</p>
            <p className="text-2xl font-bold text-gray-800">24 Items</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 rounded-lg" style={{ backgroundColor: '#068737', color: '#ffffff' }}>
            <CheckCircle2 size={28} />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Completed Tasks</p>
            <p className="text-2xl font-bold text-gray-800">18 Deliverables</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 rounded-lg" style={{ backgroundColor: '#ffc20a', color: '#78081E' }}>
            <Clock size={28} />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Pending Approvals</p>
            <p className="text-2xl font-bold text-gray-800">6 Items</p>
          </div>
        </div>
      </div>

      {/* Quick Access Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2" style={{ color: '#962c30' }}>
              <Activity size={22} />
              <h3 className="text-lg font-bold">Implementation Plan & Deliverables</h3>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              Track project start and end timelines, assigned roles, and operational status across all project phases.
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-gray-100">
            <Link
              to="/implementation-plan"
              className="inline-flex items-center gap-2 font-bold text-sm hover:underline"
              style={{ color: '#962c30' }}
            >
              Access Table View →
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2" style={{ color: '#068737' }}>
              <CheckCircle2 size={22} />
              <h3 className="text-lg font-bold">System Status</h3>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              Authentication and API services are operating normally. Real-time synchronisation is active.
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-gray-100">
            <span className="inline-flex items-center gap-2 text-xs font-semibold text-green-700 bg-green-50 px-3 py-1 rounded-full">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#068737' }}></span>
              All Systems Operational
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}