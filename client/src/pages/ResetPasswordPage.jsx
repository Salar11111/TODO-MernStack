import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { authApi } from '../services/api';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { PASSWORD_RULES, validatePassword } from '../utils/validation';

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPasswordRules, setShowPasswordRules] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setShowPasswordRules(true);

    // Same strong rule as registration and the server; server reply is fallback.
    const invalid = validatePassword(password);
    if (invalid) {
      setError(invalid);
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await authApi.resetPassword(token, password);
      toast.success('Password reset successfully');
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md border border-gray-200 dark:border-gray-800 p-8">
          <h1 className="text-2xl font-extrabold text-center mb-1">Set New Password</h1>
          <p className="text-gray-600 dark:text-gray-400 text-center text-sm mb-6">
            Enter your new password below
          </p>

          {!token ? (
            <div className="text-center space-y-4">
              <div className="bg-red-100 dark:bg-red-950 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded text-sm">
                No reset token found. Please request a new password reset link.
              </div>
              <Link
                to="/forgot-password"
                className="inline-block text-blue-600 dark:text-blue-400 font-medium hover:underline"
              >
                Request reset link
              </Link>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-4 bg-red-100 dark:bg-red-950 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-300 px-3 py-2 rounded text-sm" role="alert">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                <div>
                  <Input
                    label="New Password"
                    type="password"
                    required
                    maxLength={72}
                    autoComplete="new-password"
                    error={showPasswordRules ? validatePassword(password) : ''}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setShowPasswordRules(true);
                    }}
                    placeholder="••••••••"
                  />
                  {showPasswordRules && (
                    <ul className="mt-1 space-y-1" aria-live="polite">
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
                    </ul>
                  )}
                </div>
                <Input
                  label="Confirm Password"
                  type="password"
                  required
                  maxLength={72}
                  autoComplete="new-password"
                  error={Boolean(confirmPassword) && confirmPassword !== password ? 'Passwords do not match' : ''}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                />
                <Button type="submit" loading={loading} className="w-full">
                  {loading ? 'Resetting...' : 'Reset Password'}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
