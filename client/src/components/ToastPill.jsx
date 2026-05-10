import { FaCheck, FaExclamationCircle } from "react-icons/fa";

const ToastPill = ({ toast }) => {
  if (!toast?.message) return null;

  const type = toast.type === "success" ? "success" : "error";

  return (
    <div
      style={{
        position: "fixed",
        top: "24px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        padding: "10px 18px 10px 14px",
        borderRadius: "999px",
        boxShadow: "0 8px 24px rgba(0,0,0,0.13)",
        background: type === "success" ? "#f0fdf4" : "#fef2f2",
        border: `1px solid ${type === "success" ? "#86efac" : "#fca5a5"}`,
        color: type === "success" ? "#15803d" : "#dc2626",
        fontSize: "13px",
        fontWeight: "600",
        pointerEvents: "none",
        animation: "fadeSlideDown 0.2s ease",
      }}
    >
      {type === "success" ? <FaCheck size={12} style={{ flexShrink: 0 }} /> : <FaExclamationCircle size={13} style={{ flexShrink: 0 }} />}
      {toast.message}
    </div>
  );
};

export default ToastPill;
