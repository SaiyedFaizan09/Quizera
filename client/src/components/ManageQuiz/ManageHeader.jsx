import { FaArrowLeft } from "react-icons/fa";

const statusStyles = {
  live: { background: "#d1fae5", color: "#059669" },
  scheduled: { background: "#fef3c7", color: "#d97706" },
  closed: { background: "#e5e7eb", color: "#374151" },
};

const ManageHeader = ({ quiz, onBack }) => {
  const status = quiz?.status || "closed";
  const badgeStyle = statusStyles[status] || statusStyles.closed;

  return (
    <div style={styles.wrap}>
      <div style={styles.titleBlock}>
        <div style={styles.titleRow}>
          <h1 style={styles.title}>{quiz?.title || "Untitled Quiz"}</h1>
          <span style={{ ...styles.badge, ...badgeStyle }}>{status}</span>
        </div>
        <p style={styles.subtitle}>
          Manage quiz lifecycle, stats, responses, and evaluation.
        </p>
      </div>

      <button type="button" onClick={onBack} style={styles.backBtn}>
        <FaArrowLeft size={12} />
        <span>Back</span>
      </button>
    </div>
  );
};

const styles = {
  wrap: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  backBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    border: "none",
    background: "transparent",
    cursor: "pointer",
    color: "var(--text-light)",
    fontSize: 12,
    fontWeight: 500,
    padding: 0,
    margin: 0,
    boxShadow: "none",
    whiteSpace: "nowrap",
    width: "fit-content",
    minWidth: 0,
    height: "auto",
    lineHeight: 1,
  },
  titleBlock: {
    flex: 1,
  },
  titleRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  title: {
    margin: 0,
    fontSize: 22,
    fontWeight: 700,
    color: "var(--text-dark)",
  },
  subtitle: {
    margin: "6px 0 0",
    fontSize: 13,
    color: "var(--text-light)",
  },
  badge: {
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 600,
    textTransform: "capitalize",
    whiteSpace: "nowrap",
  },
};

export default ManageHeader;
