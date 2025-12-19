import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthService } from '../services/authService';
import InputField from '../components/InputField';
import Button from '../components/Button';
import SignInWithGoogleButton from '../components/SignInWithGoogleButton';
import Loading from '../components/Loading';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unauthorizedDomain, setUnauthorizedDomain] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Login - FinMate";
  }, []);

  const handleError = (err: any) => {
    if (err?.customData?.unauthorizedDomain) {
      setUnauthorizedDomain(err.customData.unauthorizedDomain);
    } else {
      setError(err.message || "An unexpected error occurred");
    }
  };

  // ⭐ REQUIRED FIX — added WebView detection and redirect flow
  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    setUnauthorizedDomain(null);

    try {
      const ua = navigator.userAgent.toLowerCase();
      const isWebView =
        ua.includes("wv") ||
        ua.includes("version/") ||
        (window as any).AndroidInterface ||
        ua.includes("finmate");

      if (isWebView) {
        console.log("WebView detected — using redirect login");
        await AuthService.loginWithGoogleRedirect();
      } else {
        console.log("Browser detected — using popup login");
        await AuthService.loginWithGoogle();
      }

      navigate('/');
    } catch (err: any) {
      console.error(err);
      handleError(err);
    } finally {
      setLoading(false);
    }
  };
  // ⭐ END FIX

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await AuthService.login(email, password);
      navigate('/');
    } catch (err: any) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex justify-center items-center bg-gradient-to-br from-gray-900 to-purple-900 relative p-4">
      {loading && <Loading />}

      <div className="absolute inset-0 bg-black opacity-30 rounded-3xl backdrop-blur-md" />

      <div className="relative w-full max-w-md bg-white/20 backdrop-blur-xl rounded-3xl border border-white/30 shadow-2xl p-8 animate-fadeIn">
        <div className="text-center">
          <img
            src="/logo/finmate-logo.png"
            alt="FinMate Logo"
            className="h-14 w-14 mx-auto mb-4 drop-shadow-glow"
          />
          <h1 className="text-3xl font-bold text-white drop-shadow-lg">FinMate</h1>
          <p className="text-white/80 mt-1">Your Personal Finance Companion</p>
        </div>

        <SignInWithGoogleButton onClick={handleGoogleLogin} />

        <div className="mt-4 flex items-center gap-2 text-white/70">
          <div className="flex-1 h-[1px] bg-white/30" />
          <span>OR</span>
          <div className="flex-1 h-[1px] bg-white/30" />
        </div>

        <form className="space-y-5 mt-6" onSubmit={handleLogin}>
          <InputField
            label="Email Address"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={setEmail}
          />

          <InputField
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={setPassword}
          />

          <Button text="Processing..." loading={loading} />
        </form>

        <div className="mt-4 text-center">
          {error && <p className="text-red-300">{error}</p>}
          {unauthorizedDomain && (
            <p className="text-red-400 text-sm">
              Unauthorized domain: {unauthorizedDomain}
            </p>
          )}
        </div>

        <p className="text-center mt-4 text-white/80">
          Don't have an account?{" "}
          <button
            onClick={() => navigate('/signup')}
            className="text-purple-300 underline"
          >
            Sign Up
          </button>
        </p>
      </div>
    </div>
  );
};

export default Login;
