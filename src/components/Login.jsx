import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Crown, Lock } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const success = login(username.toLowerCase().trim(), password);
    if (!success) {
      setError('Invalid username or password');
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-surface-hover rounded-2xl shadow-2xl border border-border-divider p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-surface-header rounded-full p-4 mb-4 shadow-inner border border-border-divider">
            <Crown className="w-10 h-10 text-yellow-500" />
          </div>
          <h2 className="text-2xl font-bold text-textPrimary tracking-wide">STL<span className="text-blue-500">CONTROL</span></h2>
          <p className="text-sm text-textSecondary mt-2">Sign in to access your dashboard</p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-500 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-textSecondary mb-1.5">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-[#0f172a] border border-border-divider rounded-lg px-4 py-2.5 text-textPrimary focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="Enter username"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-textSecondary mb-1.5">Password</label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#0f172a] border border-border-divider rounded-lg pl-4 pr-10 py-2.5 text-textPrimary focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="Enter password"
                required
              />
              <Lock className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-textSecondary" />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-textPrimary font-medium py-2.5 rounded-lg transition-colors shadow-lg shadow-blue-900/20 mt-4"
          >
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}
