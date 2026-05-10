import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ModeSwitch from "./ModeSwitch";
import MyAccountModal from "./MyAccountModal";
import { FaUser, FaSignOutAlt, FaBars, FaExchangeAlt } from "react-icons/fa";

const Navbar = ({ isOpen, onClose, toggleSidebar }) => {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(null);
  const [showAccount, setShowAccount] = useState(false);

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userName");
    navigate("/");
  };

  return (
    <>
      {/* Overlay for mobile */}
      <div
        style={{
          ...styles.overlay,
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? "auto" : "none",
        }}
        onClick={onClose}
      />

      <aside
        style={{
          ...styles.aside,
          width: isOpen ? "260px" : "70px",
        }}
      >
        {/* Brand header — always rendered, content fades */}
        <div style={styles.brand}>
          <button
            style={styles.menuToggleBtn}
            onClick={toggleSidebar}
            title={isOpen ? "Close menu" : "Open menu"}
            aria-label={isOpen ? "Close menu" : "Open menu"}
          >
            <FaBars size={16} />
          </button>
          <span
            style={{
              ...styles.brandLabel,
              opacity: isOpen ? 1 : 0,
              transform: isOpen ? "translateX(0)" : "translateX(-8px)",
              transition: "opacity 0.25s ease, transform 0.25s ease",
              whiteSpace: "nowrap",
              overflow: "hidden",
            }}
          >
            Menu
          </span>
        </div>

        {/* nav wrapper — relative container so both panels sit on top of each other */}
        <nav style={styles.nav}>

          {/* ── Collapsed icon stack ── always position:absolute so it never pushes layout */}
          <div
            style={{
              ...styles.collapsedStack,
              position: "absolute",
              top: 0,
              left: 0,
              width: "70px",
              opacity: isOpen ? 0 : 1,
              transform: isOpen ? "scale(0.88)" : "scale(1)",
              transition: "opacity 0.25s ease, transform 0.25s ease",
              pointerEvents: isOpen ? "none" : "auto",
            }}
          >
            <button
              style={styles.iconBtn}
              onClick={toggleSidebar}
              title="Change mode"
              aria-label="Open menu and show mode switch"
            >
              <FaExchangeAlt size={18} />
            </button>

            <button
              style={styles.iconBtn}
              onClick={() => {
                setShowAccount(true);
                onClose();
              }}
              title="My Account"
              aria-label="My Account"
            >
              <FaUser size={18} />
            </button>

            <button
              style={{ ...styles.iconBtn, ...styles.logoutIconBtn }}
              onClick={logout}
              title="Logout"
              aria-label="Logout"
            >
              <FaSignOutAlt size={18} />
            </button>
          </div>

          {/* ── Expanded content ── also position:absolute so it never affects layout flow */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              gap: "20px",
              opacity: isOpen ? 1 : 0,
              transform: isOpen ? "translateX(0)" : "translateX(-14px)",
              transition: "opacity 0.3s ease 0.06s, transform 0.3s ease 0.06s",
              pointerEvents: isOpen ? "auto" : "none",
            }}
          >
            {/* Change Mode Section */}
            <div style={styles.section}>
              <div style={styles.sectionHeader}>
                <div style={styles.modeIconContainer}>
                  <FaExchangeAlt size={14} />
                </div>
                <span style={styles.sectionLabel}>Change Mode</span>
              </div>
              <ModeSwitch />
            </div>

            {/* Account Section */}
            <div style={styles.section}>
              <span style={styles.sectionLabel}>Account</span>
              <button
                style={{
                  ...styles.actionBtn,
                  ...(hovered === "account" ? styles.actionBtnHover : {}),
                }}
                onMouseEnter={() => setHovered("account")}
                onMouseLeave={() => setHovered(null)}
                onClick={() => {
                  setShowAccount(true);
                  onClose();
                }}
              >
                <span style={styles.icon}><FaUser size={14} /></span>
                My Account
              </button>
              <button
                style={{
                  ...styles.actionBtn,
                  ...styles.logoutBtn,
                  ...(hovered === "logout" ? styles.logoutBtnHover : {}),
                }}
                onMouseEnter={() => setHovered("logout")}
                onMouseLeave={() => setHovered(null)}
                onClick={logout}
              >
                <span style={styles.icon}><FaSignOutAlt size={14} /></span>
                Logout
              </button>
            </div>
          </div>
        </nav>

        <div style={styles.footer}>
          <span
            style={{
              ...styles.footerText,
              opacity: isOpen ? 1 : 0,
              transform: isOpen ? "translateY(0)" : "translateY(4px)",
              transition: "opacity 0.25s ease, transform 0.25s ease",
            }}
          >
            Quizera
          </span>
        </div>
      </aside>

      {showAccount && <MyAccountModal onClose={() => setShowAccount(false)} />}
    </>
  );
};

const styles = {
  aside: {
    height: "calc(100vh - 64px)",
    background: "var(--bg-white)",
    borderRight: "1px solid var(--border-light)",
    display: "flex",
    flexDirection: "column",
    boxShadow: "2px 0 12px rgba(0,0,0,0.04)",
    transition: "width 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
    position: "sticky",
    top: "64px",
    zIndex: 50,
    overflow: "hidden",
    flexShrink: 0,
  },
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0,0,0,0.3)",
    zIndex: 40,
    transition: "opacity 0.35s ease",
  },
  brand: {
    borderBottom: "1px solid var(--border-light)",
    minHeight: "60px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    flexShrink: 0,
    overflow: "hidden",
    paddingRight: "16px",
    paddingTop: "8px",
    paddingBottom: "8px",
    paddingLeft: "13px",
  },
  menuToggleBtn: {
    width: "44px",
    height: "44px",
    borderRadius: "10px",
    border: "none",
    background: "transparent",
    boxShadow: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "var(--text-light)",
    transition: "all 0.15s ease",
    flexShrink: 0,
  },
  brandLabel: {
    fontWeight: "600",
    color: "var(--text-dark)",
    fontSize: "14px",
  },
  nav: {
    flex: 1,
    position: "relative",
    overflow: "hidden",
  },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "4px",
  },
  modeIconContainer: {
    width: "28px",
    height: "28px",
    borderRadius: "6px",
    background: "var(--bg-light)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "var(--primary-blue)",
    flexShrink: 0,
  },
  sectionLabel: {
    fontSize: "11px",
    fontWeight: "600",
    color: "var(--text-light)",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  iconOnlySection: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    alignItems: "center",
    padding: "8px 0",
  },
  collapsedStack: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    alignItems: "center",
    padding: "8px 0",
  },
  iconBtn: {
    width: "44px",
    height: "44px",
    borderRadius: "10px",
    border: "none",
    background: "transparent",
    boxShadow: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "var(--text-light)",
    transition: "all 0.15s ease",
  },
  iconBtnHover: {
    background: "var(--primary-blue)",
    color: "#fff",
  },
  logoutIconBtn: {
    color: "#991b1b",
  },
  logoutIconBtnHover: {
    background: "#fee2e2",
    borderColor: "#fecaca",
  },
  actionBtn: {
    width: "100%",
    padding: "10px 14px",
    borderRadius: "10px",
    border: "none",
    background: "transparent",
    cursor: "pointer",
    fontWeight: "400",
    fontSize: "14px",
    color: "var(--text-light)",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    transition: "all 0.15s ease",
    textAlign: "left",
  },
  actionBtnHover: {
    background: "var(--primary-blue)",
    color: "#fff",
    borderColor: "var(--primary-blue)",
  },
  logoutBtn: {
    color: "#ef4444",
  },
  logoutBtnHover: {
    background: "#dc2626",
    color: "#fff",
    borderColor: "#dc2626",
  },
  icon: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "20px",
  },
  footer: {
    padding: "16px",
    borderTop: "1px solid var(--border-light)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "50px",
  },
  footerText: {
    fontSize: "12px",
    color: "var(--text-light)",
    fontWeight: "500",
  },
};

export default Navbar;
