import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaTimes } from "react-icons/fa";
import { useUser } from "../context/UserContext";
import API from "../services/api";

const MyAccountModal = ({ onClose }) => {
  const navigate = useNavigate();
  const { userName, setUserName } = useUser();
  const [name, setName] = useState(userName);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  const handleSaveName = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name cannot be empty.");
      return;
    }
    // Call backend to update name in DB
    (async () => {
      try {
        const res = await API.put("/auth/update", { name: name.trim() });
              if (res && res.data && res.data.user) {
                // update context and localStorage (context helper already writes to localStorage,
                // but set explicitly here for extra safety)
                setUserName(res.data.user.name);
                try {
                  localStorage.setItem("userName", res.data.user.name);
                } catch (e) {
                  // ignore localStorage errors
                }
                setMessage("Name updated.");
                setError("");
                // close modal shortly after success so header/dashboard refresh
                setTimeout(() => onClose && onClose(), 700);
        } else {
          setError("Unexpected server response.");
        }
      } catch (err) {
        const msg = err?.response?.data?.message || "Failed to update name.";
        setError(msg);
      }
    })();
  };

  const handleChangePassword = (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("Fill all password fields.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New password and confirm do not match.");
      return;
    }
    // Client-side password validation (same policy as backend)
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (!/[a-z]/.test(newPassword)) {
      setError("New password must include a lowercase letter.");
      return;
    }
    if (!/[A-Z]/.test(newPassword)) {
      setError("New password must include an uppercase letter.");
      return;
    }
    if (!/\d/.test(newPassword)) {
      setError("New password must include a number.");
      return;
    }
    if (!/[!@#$%^&*(),.?\":{}|<>]/.test(newPassword)) {
      setError("New password must include a special character.");
      return;
    }
    // Call API to change password in DB
    (async () => {
      setPwLoading(true);
      try {
        const res = await API.put("/auth/change-password", {
          currentPassword,
          newPassword,
        });
        if (res && res.data && res.data.message) {
          setMessage(res.data.message || "Password updated.");
          setError("");
          setCurrentPassword("");
          setNewPassword("");
          setConfirmPassword("");
        } else {
          setError("Unexpected server response.");
        }
      } catch (err) {
        console.error("changePassword error (client):", err);
        // Prefer server message when available, otherwise include status and message
        const status = err?.response?.status;
        const serverMsg = err?.response?.data?.message;
        const msg = serverMsg || (status ? `Request failed (status ${status})` : err?.message) || "Failed to update password.";
        setError(msg);
      } finally {
        setPwLoading(false);
      }
    })();
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
                <h2 style={styles.title}>My Account</h2>
                <button
                  style={styles.closeIconBtn}
                  onClick={onClose}
                  aria-label="Close"
                  title="Close"
                >
                  <FaTimes />
                </button>
        </div>

        <div style={styles.body}>
          {message && <p style={styles.message}>{message}</p>}
          {error && <p style={styles.error}>{error}</p>}

          <section style={styles.section}>
            <h3 style={styles.sectionTitle}>Change name</h3>
            <form onSubmit={handleSaveName} style={styles.form}>
              <input
                type="text"
                placeholder="Display name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={styles.input}
              />
              <button type="submit" style={styles.submitBtn}>
                Save name
              </button>
            </form>
          </section>

          <section style={styles.section}>
            <h3 style={styles.sectionTitle}>Change password</h3>
            <form onSubmit={handleChangePassword} style={styles.form}>
              <input
                type="password"
                placeholder="Current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                style={styles.input}
              />
              <input
                type="password"
                placeholder="New password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                style={styles.input}
              />
              <input
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={styles.input}
              />
              <button type="submit" style={styles.submitBtn}>
                Update password
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.4)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modal: {
    background: "var(--bg-white)",
    borderRadius: "16px",
    boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
    maxWidth: "420px",
    width: "90%",
    maxHeight: "90vh",
    overflow: "auto",
  },
  header: {
    position: "relative",
    /* keep title centered on the left, place close button absolutely on top-right */
    display: "flex",
    alignItems: "center",
    padding: "12px 20px",
    borderBottom: "1px solid var(--border-light)",
  },
  title: {
    margin: 0,
    fontSize: "18px",
    fontWeight: "600",
    color: "var(--text-dark)",
  },
  closeIconBtn: {
    position: "absolute",
    right: "12px",
    top: "12px",
    border: "none",
    background: "transparent",
    color: "var(--text-dark)",
    cursor: "pointer",
    fontSize: "14px",
    padding: 0,
    margin: 0,
    lineHeight: 1,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    boxShadow: "none",
    outline: "none",
  },
  body: {
    padding: "24px",
  },
  message: {
    margin: "0 0 16px 0",
    padding: "10px 12px",
    background: "#ecfdf5",
    color: "#059669",
    borderRadius: "8px",
    fontSize: "14px",
  },
  error: {
    margin: "0 0 16px 0",
    padding: "10px 12px",
    background: "#fef2f2",
    color: "#b91c1c",
    borderRadius: "8px",
    fontSize: "14px",
  },
  section: {
    marginBottom: "24px",
  },
  sectionTitle: {
    margin: "0 0 12px 0",
    fontSize: "14px",
    fontWeight: "600",
    color: "var(--text-dark)",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  input: {
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px solid var(--border-light)",
    fontSize: "14px",
  },
  submitBtn: {
    padding: "10px 16px",
    borderRadius: "8px",
    border: "none",
    background: "var(--primary-blue)",
    color: "#fff",
    fontWeight: "500",
    cursor: "pointer",
    fontSize: "14px",
  },
};

export default MyAccountModal;
