import { useState, useEffect } from "react";
import { useUser } from "../context/UserContext";
import { useLocation } from "react-router-dom";
import API from "../services/api";
import { useNavigate } from "react-router-dom";
import "../styles/auth.css";
import { Link } from "react-router-dom";
import { FcGoogle } from "react-icons/fc";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [forgotPassword, setForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const navigate = useNavigate();
  const { setUserName } = useUser();
  const location = useLocation();

  useEffect(() => {
    // If navigated from register with email, prefill it
    if (location?.state?.email) {
      setEmail(location.state.email);
    }
  }, [location]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      navigate("/dashboard");
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setEmailError("");

    // basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError("Please enter a valid email address.");
      return;
    }
    try {
      const res = await API.post("/auth/login", { email, password });
      localStorage.setItem("token", res.data.token);
      if (res.data.user?.name) {
        localStorage.setItem("userName", res.data.user.name);
        // update context so header and other components refresh immediately
        try {
          setUserName(res.data.user.name);
        } catch (e) {
          // ignore if context not available
        }
      }
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    }
  };

  const handleForgotSubmit = (e) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    setForgotSent(true);
  };

  const handleGoogleLogin = () => {
    // Redirect to backend Google OAuth endpoint
    window.location.href = "http://localhost:5000/api/auth/google";
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2 className="auth-title">Welcome Back</h2>
          <p className="auth-subtitle">Sign in to continue to Quizera</p>
        </div>

        {!forgotPassword ? (
          <>
            {error && <p className="error">{error}</p>}
            <form onSubmit={handleSubmit}>
              <div className="input-group">
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                {emailError && <p className="field-error">{emailError}</p>}
              </div>
              <div className="input-group">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <div className="show-password-row">
                  <label>
                    <input
                      type="checkbox"
                      checked={showPassword}
                      onChange={(e) => setShowPassword(e.target.checked)}
                    />
                    &nbsp;Show password
                  </label>
                </div>
              </div>
              <button type="submit" className="login-btn">Sign In</button>
            </form>
            
            <div className="divider">
              <span>or</span>
            </div>
            
            <button type="button" className="google-btn" onClick={handleGoogleLogin}>
              <FcGoogle className="google-icon" />
              Continue with Google
            </button>
            
            <div className="link forgot-link">
              <button type="button" className="link-btn" onClick={() => setForgotPassword(true)}>
                Forgot password?
              </button>
            </div>
            <div className="link">
              New here? <Link to="/register">Create an account</Link>
            </div>
          </>
        ) : !forgotSent ? (
          <>
            <p className="forgot-desc">Enter your email and we'll send you a reset link.</p>
            <form onSubmit={handleForgotSubmit}>
              <input
                type="email"
                placeholder="Email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                required
              />
              <button type="submit" className="login-btn">Send reset link</button>
            </form>
            <div className="link">
              <button type="button" className="link-btn" onClick={() => { setForgotPassword(false); setForgotEmail(""); }}>
                Back to login
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="forgot-sent">We've sent a reset link to <strong>{forgotEmail}</strong>.</p>
            <div className="link">
              <button type="button" className="link-btn" onClick={() => { setForgotPassword(false); setForgotSent(false); setForgotEmail(""); }}>
                Back to login
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Login;