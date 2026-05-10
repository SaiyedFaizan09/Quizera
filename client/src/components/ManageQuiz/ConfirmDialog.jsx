const overlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(15,23,42,0.3)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 50,
};

const dialogStyle = {
  width: "100%",
  maxWidth: 420,
  background: "var(--bg-white)",
  borderRadius: 12,
  padding: 20,
  boxShadow: "0 10px 25px rgba(15,23,42,0.2)",
};

const ConfirmDialog = ({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
}) => {
  if (!open) return null;

  return (
    <div style={overlayStyle}>
      <div style={dialogStyle}>
        <h3 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 600 }}>{title}</h3>
        <p style={{ margin: "0 0 16px", fontSize: 14, color: "var(--text-light)" }}>
          {description}
        </p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: "6px 12px",
              borderRadius: 6,
              border: "1px solid var(--border-light)",
              background: "#fff",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={{
              padding: "6px 12px",
              borderRadius: 6,
              border: "1px solid #ef4444",
              background: "#ef4444",
              color: "#fff",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
