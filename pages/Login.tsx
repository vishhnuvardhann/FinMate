
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthService } from '../services/authService';
import { firebaseConfig } from '../config/firebaseConfig';

const Login: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unauthorizedDomain, setUnauthorizedDomain] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setUnauthorizedDomain(null);
    
    try {
      if (isLogin) {
        await AuthService.login(email, password);
      } else {
        await AuthService.signup(name, email, password);
      }
      navigate('/');
    } catch (err: any) {
      console.error(err);
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    setUnauthorizedDomain(null);
    try {
      await AuthService.loginWithGoogle();
      navigate('/');
    } catch (err: any) {
      console.error(err);
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleError = (err: any) => {
    let errorMessage = "Authentication failed. Please try again.";
      
    // Handle specific Firebase errors
    if (err.code === 'auth/invalid-credential') {
      errorMessage = "Login failed. Incorrect email or password, or this account does not exist.";
    } else if (err.code === 'auth/user-not-found') {
      errorMessage = "No account found with this email. Please switch to 'Sign Up' to create one.";
    } else if (err.code === 'auth/wrong-password') {
      errorMessage = "Incorrect password. Please try again.";
    } else if (err.code === 'auth/email-already-in-use') {
      errorMessage = "An account with this email already exists. Please switch to 'Log In'.";
    } else if (err.code === 'auth/weak-password') {
      errorMessage = "Password should be at least 6 characters long.";
    } else if (err.code === 'auth/operation-not-allowed') {
      errorMessage = "Login provider is not enabled in Firebase Console.";
    } else if (err.code === 'auth/popup-closed-by-user') {
      errorMessage = "Login cancelled.";
    } else if (err.code === 'auth/unauthorized-domain') {
      const currentDomain = window.location.hostname;
      setUnauthorizedDomain(currentDomain);
      console.log("Firebase Unauthorized Domain:", currentDomain);
      errorMessage = "Security Block: This domain is not on the Allowlist.";
    } else if (err.code === 'auth/network-request-failed') {
      errorMessage = "Network error. Please check your internet connection. If you are using an Ad-Blocker, please disable it for this site and try again.";
    }

    setError(errorMessage);
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError(null);
    setUnauthorizedDomain(null);
  };

  const copyDomain = () => {
    if (unauthorizedDomain) {
      navigator.clipboard.writeText(unauthorizedDomain);
      alert('Domain copied to clipboard!');
    }
  }

  // Construct direct link to Firebase Console Settings
  const consoleUrl = `https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/settings`;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="glass-panel w-full max-w-md p-8 rounded-2xl border border-white/10 shadow-2xl relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl"></div>

        <div className="relative z-10">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/30">
              <i className="ri-money-dollar-circle-fill text-3xl text-white"></i>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">FinMate</h1>
            <p className="text-gray-400">Your Personal Finance Companion</p>
          </div>

          {error && (
            <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-xl p-4 animate-fade-in">
              <div className="flex gap-3 items-start">
                <i className="ri-error-warning-fill text-red-400 text-xl mt-0.5"></i>
                <div className="text-sm text-red-200 w-full">
                  <p className="font-semibold mb-1">Error</p>
                  <p>{error}</p>
                  
                  {unauthorizedDomain && (
                    <div className="mt-3 bg-slate-900/80 p-3 rounded-lg border border-white/20 shadow-inner">
                      <p className="text-xs text-amber-400 font-bold mb-1 uppercase tracking-wider">Action Required:</p>
                      <p className="text-xs text-gray-300 mb-2">
                        Google blocks sign-ins from new domains by default. You must add this domain to your Firebase Console:
                      </p>
                      <div className="flex items-center gap-2 mb-3">
                        <code className="flex-1 bg-black/50 p-2 rounded text-xs text-white font-mono break-all border border-white/10 select-all">
                          {unauthorizedDomain}
                        </code>
                        <button 
                          onClick={copyDomain}
                          className="p-2 bg-indigo-600 rounded hover:bg-indigo-500 transition text-white"
                          title="Copy to clipboard"
                        >
                          <i className="ri-file-copy-line"></i>
                        </button>
                      </div>
                      <a 
                        href={consoleUrl} 
                        target="_blank" 
                        rel="noreferrer"
                        className="block w-full py-2 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 text-center rounded border border-indigo-500/30 text-xs font-bold transition"
                      >
                        Click here to Open Firebase Settings <i className="ri-external-link-line ml-1"></i>
                      </a>
                      <p className="text-[10px] text-gray-500 mt-2 text-center">
                        (Go to Authentication &rarr; Settings &rarr; Authorized Domains &rarr; Add Domain)
                      </p>
                    </div>
                  )}

                  {error.includes("Login failed") && !unauthorizedDomain && (
                    <button onClick={toggleMode} className="block mt-2 text-indigo-300 hover:text-white underline">
                      Need to create an account?
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full bg-white hover:bg-gray-100 text-gray-800 font-semibold py-3 rounded-xl transition-all transform hover:scale-[1.02] flex justify-center items-center gap-3"
            >
               <i className="ri-google-fill text-xl text-red-500"></i>
               <span>Continue with Google</span>
            </button>

            <div className="flex items-center gap-4">
              <div className="h-px bg-white/10 flex-1"></div>
              <span className="text-sm text-gray-500 uppercase tracking-wider">Or</span>
              <div className="h-px bg-white/10 flex-1"></div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Full Name</label>
                  <div className="relative">
                    <i className="ri-user-line absolute left-3 top-3 text-gray-500"></i>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-indigo-500 focus:bg-white/10 transition"
                      placeholder="John Doe"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm text-gray-400 mb-1">Email Address</label>
                <div className="relative">
                  <i className="ri-mail-line absolute left-3 top-3 text-gray-500"></i>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-indigo-500 focus:bg-white/10 transition"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Password</label>
                <div className="relative">
                  <i className="ri-lock-line absolute left-3 top-3 text-gray-500"></i>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-indigo-500 focus:bg-white/10 transition"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold py-3 rounded-xl shadow-lg shadow-indigo-500/25 transition-all transform hover:scale-[1.02] disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2"
              >
                {loading ? (
                  <>
                    <i className="ri-loader-4-line animate-spin text-xl"></i>
                    Processing...
                  </>
                ) : (
                  <>
                    {isLogin ? 'Sign In' : 'Create Account'}
                    <i className="ri-arrow-right-line"></i>
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="mt-6 text-center">
            <p className="text-gray-400 text-sm">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <button
                onClick={toggleMode}
                className="text-indigo-400 hover:text-indigo-300 font-medium transition"
              >
                {isLogin ? 'Sign Up' : 'Log In'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
