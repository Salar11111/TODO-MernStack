import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { authApi } from '../services/api';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      setSent(true);
      toast.success('Reset link sent (check the server console in dev)');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md border border-gray-200 dark:border-gray-800 p-8">
          <h1 className="text-2xl font-extrabold text-center mb-1">Reset Password</h1>
          <p className="text-gray-600 dark:text-gray-400 text-center text-sm mb-6">
            Enter your email and we'll send you a reset link
          </p>

          {sent ? (
            <div className="text-center space-y-4">
              <div className="bg-green-100 dark:bg-green-950 border border-green-400 dark:border-green-800 text-green-700 dark:text-green-300 px-4 py-3 rounded text-sm">
                If that email exists, a reset link has been sent. The link expires in 30 minutes.
              </div>
              <Link
                to="/login"
                className="inline-block text-blue-600 dark:text-blue-400 font-medium hover:underline"
              >
                Back to login
              </Link>
            </div>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="Email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
                <Button type="submit" loading={loading} className="w-full">
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </Button>
              </form>

              <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-6">
                Remembered your password?{' '}
                <Link to="/login" className="text-blue-600 dark:text-blue-400 font-medium hover:underline">
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
