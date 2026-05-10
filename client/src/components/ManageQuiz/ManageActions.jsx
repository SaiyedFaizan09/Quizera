import { FaPlay, FaStop, FaTrash, FaEdit } from "react-icons/fa";

const ManageActions = ({
  quiz,
  onGoLive,
  onCloseQuiz,
  onDelete,
  canEdit,
  onEditTab,
}) => {
  const status = quiz?.status;
  const canGoLive = status === "scheduled" || status === "closed";
  const canClose = status === "scheduled" || status === "live";

  return (
    <div style={styles.row}>
      <button
        type="button"
        onClick={onGoLive}
        disabled={!canGoLive}
        style={{
          ...styles.btn,
          ...styles.primary,
          ...(canGoLive ? {} : styles.disabled),
        }}
      >
        <FaPlay size={12} />
        Go Live
      </button>

      <button
        type="button"
        onClick={onEditTab}
        disabled={!canEdit}
        style={{
          ...styles.btn,
          ...styles.secondary,
          ...(canEdit ? {} : styles.disabled),
        }}
      >
        <FaEdit size={12} />
        Edit Quiz
      </button>

      <button
        type="button"
        onClick={onCloseQuiz}
        disabled={!canClose}
        style={{
          ...styles.btn,
          ...styles.warning,
          ...(canClose ? {} : styles.disabled),
        }}
      >
        <FaStop size={12} />
        Close Quiz
      </button>

      <button
        type="button"
        onClick={onDelete}
        style={{ ...styles.btn, ...styles.danger }}
      >
        <FaTrash size={12} />
        Delete
      </button>
    </div>
  );
};

const styles = {
  row: {
    display: "flex",
    flexWrap: "nowrap",
    gap: 10,
    alignItems: "center",
    width: "100%",
  },
  btn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 12px",
    borderRadius: 8,
    border: "none",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    height: 36,
  },
  primary: {
    background: "#06b6d4",
    color: "#fff",
  },
  secondary: {
    background: "#fff",
    color: "var(--text-dark)",
    border: "1px solid var(--border-light)",
  },
  warning: {
    background: "#fff7ed",
    color: "#ea580c",
    border: "1px solid #fdba74",
  },
  danger: {
    background: "#fef2f2",
    color: "#b91c1c",
    border: "1px solid #fecaca",
    marginLeft: "auto",
  },
  disabled: {
    opacity: 0.6,
    cursor: "not-allowed",
  },
};

export default ManageActions;
