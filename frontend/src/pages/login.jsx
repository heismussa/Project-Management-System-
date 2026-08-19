import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../lib/axios';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      const response = await api.post('/login', { login: email, password });
      login(response.data.user, response.data.token);
      navigate('/home');
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
        
        {/* Header Banner */}
        <div 
          className="p-6 text-white text-center"
          style={{ backgroundColor: '#962c30' }}
        >
          <img
            src="/nssf-logo.png"
            alt="NSSF Logo"
            className="mx-auto mb-3 h-20 w-auto rounded-lg"
          />
          <h1 className="text-2xl font-bold tracking-wide">National Social Security Fund</h1>
          <p className="text-xs mt-1 uppercase tracking-widest font-bold" style={{ color: '#ffc20a' }}>
            Project Management System
          </p>
        </div>

        {/* Form Body */}
        <div className="p-8 space-y-5">
          {errorMessage && (
            <div 
              className="p-3 text-sm text-white rounded-lg font-medium shadow-sm"
              style={{ backgroundColor: '#068737' }}
            >
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                placeholder="user@example.com"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none transition-all text-sm"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Password
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none transition-all text-sm"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full text-white font-bold py-3 rounded-lg shadow-md transition-all duration-200 mt-2 flex items-center justify-center hover:opacity-90"
              style={{ backgroundColor: '#962c30' }}
            >
              {loading ? 'Logging in...' : 'Sign In'}
            </button>
          </form>

          {/* Registration Link */}
          <div className="pt-4 text-center border-t border-gray-100">
            <p className="text-xs text-gray-500 mb-2">Don't have an account?</p>
            <Link
              to="/register"
              className="inline-block w-full text-center border-2 font-bold py-2.5 rounded-lg text-sm transition-all hover:bg-gray-50"
              style={{ borderColor: '#962c30', color: '#962c30' }}
            >
              Create New Account
            </Link>
          </div>
        </div>

        {/* Gold Accent Bar */}
        <div className="h-2 w-full" style={{ backgroundColor: '#ffc20a' }}></div>
      </div>
    </div>
  );
}