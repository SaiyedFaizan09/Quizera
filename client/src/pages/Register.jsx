import { useState } from "react";
import API from "../services/api";
import { useNavigate, useLocation } from "react-router-dom";
import { Link } from "react-router-dom";
import "../styles/auth.css";

function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    // Frontend password validation (same rules as backend)
    const pwd = password || "";
    const pwdCheck = (() => {
      if (pwd.length < 8) return "Password must be at least 8 characters.";
      if (!/[a-z]/.test(pwd)) return "Password must include a lowercase letter.";
      if (!/[A-Z]/.test(pwd)) return "Password must include an uppercase letter.";
      if (!/\d/.test(pwd)) return "Password must include a number.";
      if (!/[!@#$%^&*(),.?\":{}|<>]/.test(pwd)) return "Password must include a special character.";
      return "";
    })();
    if (pwdCheck) {
      setPasswordError(pwdCheck);
      return;
    }
    setPasswordError("");

    try {
      await API.post("/auth/register", {
        name,
        email,
        password,
      });

      setSuccess("Registration successful! Please login.");

      setTimeout(() => {
        navigate("/");
      }, 1500);
    } catch (err) {
      const msg = err.response?.data?.message || "Registration failed";
      setError(msg);
      // If user already exists, redirect to login and prefill email
      if (msg.toLowerCase().includes("user already exists")) {
        setTimeout(() => {
          navigate("/", { state: { email } });
        }, 1200);
      }
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2 className="auth-title">Create Account</h2>
          <p className="auth-subtitle">Join Quizera and start creating quizzes</p>
        </div>

        {error && <p className="error">{error}</p>}
        {success && <p style={{ color: "green", textAlign: "center" }}>{success}</p>}

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <input
              type="text"
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {passwordError && <p className="field-error">{passwordError}</p>}
            <p style={{ fontSize: 13, color: "#64748b", marginTop: 8 }}>
              Password must be at least 8 characters and include uppercase, lowercase, number and a special character.
            </p>
          </div>

          <button type="submit">Create Account</button>
        </form>

        <div className="link">
          Have an account? <Link to="/">Back to login</Link>
        </div>
      </div>
    </div>
  );
}

export default Register;
