import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../context/authContext';
import { PASSWORD_RULES, passwordErrors, validatePassword } from '../utils/validation';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPasswordRules, setShowPasswordRules] = useState(false);

  const unmetRules = passwordErrors(password);
  const passwordProblem = showPasswordRules ? validatePassword(password) : null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setShowPasswordRules(true);
    // Validate before any network call: the server response stays as fallback.
    const invalid = validatePassword(password);
    if (invalid) {
      setError(invalid);
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await register(name, email, password);
      toast.success('Account created! Welcome aboard.');
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md border border-gray-200 dark:border-gray-800 p-8">
          <h1 className="text-2xl font-extrabold text-center mb-1">Create your account</h1>
          <p className="text-gray-600 dark:text-gray-400 text-center text-sm mb-6">
            Start staying organized today
          </p>

          {error && (
            <div className="mb-4 bg-red-100 dark:bg-red-950 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-300 px-3 py-2 rounded text-sm" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-1">
                Name
              </label>
              <input
                id="name"
                type="text"
                required
                minLength={2}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
                placeholder="Jane Doe"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                maxLength={72}
                autoComplete="new-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setShowPasswordRules(true);
                }}
                className={inputClass}
                aria-invalid={Boolean(passwordProblem)}
                aria-describedby="password-requirements"
                placeholder="At least 8 characters"
              />
              <div id="password-requirements" className="mt-2" aria-live="polite">
                {showPasswordRules && (
                  <ul className="space-y-1">
                    {PASSWORD_RULES.map((rule) => {
                      const met = rule.test(password);
                      return (
                        <li
                          key={rule.message}
                          className={`flex items-start gap-2 text-xs ${met ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-600 dark:text-gray-400'}`}
                        >
                          <span aria-hidden="true">{met ? '✓' : '○'}</span>
                          <span>{rule.message}</span>
                        </li>
                      );
                    })}
                    {unmetRules.length > 0 && !password && (
                      <li className="text-xs text-red-600 dark:text-red-400">{unmetRules[0]}</li>
                    )}
                  </ul>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="confirm" className="block text-sm font-medium mb-1">
                Confirm Password
              </label>
              <input
                id="confirm"
                type="password"
                required
                maxLength={72}
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className={inputClass}
                aria-invalid={Boolean(confirm) && confirm !== password}
                placeholder="Repeat your password"
              />
              {Boolean(confirm) && confirm !== password && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400" role="alert">
                  Passwords do not match
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-600 dark:text-blue-400 font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
