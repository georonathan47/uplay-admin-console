import { useState, type FormEvent } from 'react';
import { Activity, Lock, Mail, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/lib/auth';

export function AuthPage() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === 'signin') {
        await signIn(email, password);
      } else {
        await signUp(email, password);
        setMode('signin');
        setError('Account created. Please sign in.');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      setError(mode === 'signin' && msg.includes('Invalid login')
        ? 'Invalid email or password'
        : msg
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-dark-950 relative overflow-hidden">
      {/* Ambient glow background */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-secondary-500/10 rounded-full blur-3xl" />

      <div className="relative w-full max-w-md animate-slide-up">
        {/* Logo header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shadow-glow mb-4">
            <Activity size={28} className="text-white" />
          </div>
          <h1 className="font-display font-bold text-white text-2xl">Youplay</h1>
          <p className="text-sm text-dark-400 mt-1">Management Dashboard</p>
        </div>

        {/* Auth card */}
        <div className="card p-8 shadow-soft">
          <div className="flex gap-1 p-1 bg-dark-800 rounded-xl mb-6">
            <button
              onClick={() => { setMode('signin'); setError(null); }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                mode === 'signin'
                  ? 'bg-primary-500 text-white shadow-glow'
                  : 'text-dark-300 hover:text-dark-100'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setMode('signup'); setError(null); }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                mode === 'signup'
                  ? 'bg-primary-500 text-white shadow-glow'
                  : 'text-dark-300 hover:text-dark-100'
              }`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label-field" htmlFor="email">Email</label>
              <div className="relative">
                <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-400" />
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="input-field pl-11"
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label className="label-field" htmlFor="password">Password</label>
              <div className="relative">
                <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-400" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-field pl-11 pr-11"
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-200 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div className={`flex items-start gap-2.5 p-3 rounded-xl text-sm animate-fade-in ${
                error.includes('Account created')
                  ? 'bg-success-500/10 text-success-300 border border-success-500/20'
                  : 'bg-error-500/10 text-error-300 border border-error-500/20'
              }`}>
                <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                mode === 'signin' ? 'Sign In' : 'Create Account'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-dark-500 mt-6">
          {mode === 'signin'
            ? "Don't have an account? "
            : 'Already have an account? '}
          <button
            onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null); }}
            className="text-primary-400 hover:text-primary-300 font-medium transition-colors"
          >
            {mode === 'signin' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  );
}
