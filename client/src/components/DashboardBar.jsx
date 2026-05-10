import ModeSwitch from "./ModeSwitch";

const DashboardBar = () => {
  return (
    <div style={styles.bar}>
      <ModeSwitch />

      <div style={styles.actions}>
        <button style={styles.btn}>My Account</button>
        <button style={{ ...styles.btn, ...styles.logout }}>Logout</button>
      </div>
    </div>
  );
};

const styles = {
  bar: {
    background: "var(--bg-white)",
    borderBottom: "1px solid var(--border-light)",
    padding: "12px 24px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  },
  actions: {
    display: "flex",
    gap: "12px"
  },
  btn: {
    padding: "8px 14px",
    borderRadius: "var(--radius)",
    border: "none",
    background: "black",
    cursor: "pointer",
    fontWeight: "400",
    padding: "6px 14px",      /* reduce vertical padding */
    height: "36px",        /* fixed clean height */
    fontsize: "14px",
    borderRadius: "8px",
    width: "100%"
  },
  myAccount:{
    innerWidth: "100%"
  },
  logout: {
    background: "#fee2e2",
    color: "#991b1b"
  }
};

export default DashboardBar;