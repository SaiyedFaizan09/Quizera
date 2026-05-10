import { NavLink } from "react-router-dom";

const ModeSwitch = () => {
  return (
    <div style={styles.switch}>
      <NavLink
        to="/dashboard/attempt"
        style={({ isActive }) => ({
          ...styles.btn,
          ...(isActive ? styles.active : {}),
        })}
        end={false}
      >
        Attempt
      </NavLink>
      <NavLink
        to="/dashboard/create"
        style={({ isActive }) => ({
          ...styles.btn,
          ...(isActive ? styles.active : {}),
        })}
      >
        Create
      </NavLink>
    </div>
  );
};

const styles = {
  switch: {
    display: "flex",
    gap: "6px",
    width: "100%",
    background: "var(--bg-light)",
    padding: "4px",
    borderRadius: "999px",
    border: "1px solid var(--border-light)",
  },
  btn: {
    flex: 1,
    padding: "8px 16px",
    borderRadius: "999px",
    border: "none",
    background: "transparent",
    cursor: "pointer",
    fontWeight: "500",
    fontSize: "14px",
    color: "var(--text-dark)",
    textDecoration: "none",
    transition: "all 0.2s ease",
    textAlign: "center",
  },
  active: {
    background: "var(--primary-blue)",
    color: "#fff",
  },
};

export default ModeSwitch;
