import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";
import { FaClock, FaCheckCircle, FaTimesCircle, FaQuestionCircle, FaTrophy, FaCalendarAlt, FaArrowLeft } from "react-icons/fa";
import { startAttempt } from "../services/attemptService";

const AttemptQuizInfo = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state || {};
  const { quizCode, quizPass, quiz, existingAttemptId } = state;
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

  const handleStart = async () => {
    setError("");
    if (!quizCode || !quizPass) return;
    try {
      setStarting(true);
      if (existingAttemptId) {
        navigate(`/attempt-quiz/${existingAttemptId}`, { state: { quiz } });
        return;
      }

      const data = await startAttempt({ quizCode, quizPass });
      navigate(`/attempt-quiz/${data.attemptId}`, { state: { quiz } });
    } catch (err) {
      setError(err?.response?.data?.message || "Could not start quiz attempt");
    } finally {
      setStarting(false);
    }
  };

  const handleBack = () => {
    navigate("/dashboard/attempt");
  };

  if (!quizCode || !quizPass || !quiz) {
    navigate("/dashboard/attempt");
    return null;
  }

  return (
    <DashboardLayout>
      <div style={styles.wrap}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Quiz Information</h1>
            <p style={styles.subtitle}>Review details before starting. Once started, you cannot attempt again.</p>
          </div>
          <div style={styles.backLink} onClick={handleBack}>
            <FaArrowLeft size={14} />
            <span>Back</span>
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.quizHeader}>
            <h2 style={styles.quizTitle}>{quiz.title}</h2>
          </div>

          <div style={styles.infoGrid}>
            <div style={styles.infoItem}>
              <div style={{...styles.infoIcon, background: "#dbeafe"}}>
                <FaClock size={18} color="#2563eb" />
              </div>
              <div style={styles.infoContent}>
                <span style={styles.infoLabel}>Timed Quiz</span>
                <span style={styles.infoValue}>{quiz.timed ? "Yes" : "No"}</span>
              </div>
            </div>

            <div style={styles.infoItem}>
              <div style={{...styles.infoIcon, background: quiz.negativeMarking ? "#fee2e2" : "#dcfce7"}}>
                {quiz.negativeMarking ? (
                  <FaTimesCircle size={18} color="#dc2626" />
                ) : (
                  <FaCheckCircle size={18} color="#16a34a" />
                )}
              </div>
              <div style={styles.infoContent}>
                <span style={styles.infoLabel}>Negative Marking</span>
                <span style={styles.infoValue}>{quiz.negativeMarking ? "Yes" : "No"}</span>
              </div>
            </div>

            <div style={styles.infoItem}>
              <div style={{...styles.infoIcon, background: "#fef3c7"}}>
                <FaQuestionCircle size={18} color="#d97706" />
              </div>
              <div style={styles.infoContent}>
                <span style={styles.infoLabel}>Total Questions</span>
                <span style={styles.infoValue}>{quiz.totalQuestions}</span>
              </div>
            </div>

            <div style={styles.infoItem}>
              <div style={{...styles.infoIcon, background: "#e9d5ff"}}>
                <FaTrophy size={18} color="#9333ea" />
              </div>
              <div style={styles.infoContent}>
                <span style={styles.infoLabel}>Maximum Marks</span>
                <span style={styles.infoValue}>{quiz.maxMarks}</span>
              </div>
            </div>

            {quiz.timed && (
              <div style={styles.infoItem}>
                <div style={{...styles.infoIcon, background: "#dbeafe"}}>
                  <FaClock size={18} color="#2563eb" />
                </div>
                <div style={styles.infoContent}>
                  <span style={styles.infoLabel}>Total Time</span>
                  <span style={styles.infoValue}>
                    {quiz.totalTimeMinutes} minutes
                    {quiz.wholeOrPerQuestion === "per" ? " (sum of per-question time)" : ""}
                  </span>
                </div>
              </div>
            )}

            <div style={styles.infoItem}>
              <div style={{...styles.infoIcon, background: "#f0fdf4"}}>
                <FaCalendarAlt size={18} color="#16a34a" />
              </div>
              <div style={styles.infoContent}>
                <span style={styles.infoLabel}>Start Time</span>
                <span style={styles.infoValue}>{new Date().toLocaleString()}</span>
              </div>
            </div>
          </div>
          {error && <p style={styles.errorText}>{error}</p>}

          <div style={styles.buttonWrapper}>
            <button style={styles.startBtn} onClick={handleStart} disabled={starting}>
              {starting ? "Starting..." : "Start the Quiz"}
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

const styles = {
  wrap: { 
    maxWidth: "680px", 
    margin: "0 auto",
  },
  header: {
    marginBottom: "24px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "20px",
  },
  title: { 
    fontSize: "28px", 
    fontWeight: "700", 
    color: "var(--text-dark)", 
    margin: "0 0 8px 0" 
  },
  subtitle: { 
    fontSize: "15px", 
    color: "var(--text-light)", 
    margin: "0",
    lineHeight: "1.6",
  },
  backLink: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    color: "var(--text-dark)",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "color 0.2s ease",
    flexShrink: 0,
    width: "fit-content",
  },
  card: {
    background: "var(--bg-white)",
    borderRadius: "16px",
    padding: "32px",
    border: "1px solid var(--border-light)",
    boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
  },
  quizHeader: {
    marginBottom: "28px",
    paddingBottom: "20px",
    borderBottom: "2px solid var(--border-light)",
  },
  quizTitle: { 
    margin: "0", 
    fontSize: "24px", 
    fontWeight: "600", 
    color: "var(--text-dark)",
  },
  infoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "16px",
    marginBottom: "28px",
  },
  infoItem: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "14px",
    background: "var(--bg-light)",
    borderRadius: "10px",
    border: "1px solid var(--border-light)",
    transition: "all 0.2s ease",
  },
  infoIcon: {
    width: "42px",
    height: "42px",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  infoContent: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    flex: 1,
  },
  infoLabel: {
    fontSize: "12px",
    fontWeight: "500",
    color: "var(--text-light)",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  infoValue: {
    fontSize: "15px",
    fontWeight: "600",
    color: "var(--text-dark)",
  },
  buttonWrapper: {
    display: "flex",
    justifyContent: "center",
    paddingTop: "8px",
  },
  startBtn: {
    padding: "14px 36px",
    borderRadius: "10px",
    border: "none",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    color: "#fff",
    fontWeight: "600",
    fontSize: "16px",
    cursor: "pointer",
    transition: "all 0.2s ease",
    boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)",
  },
  errorText: {
    margin: "4px 0 0",
    color: "#dc2626",
    fontSize: "14px",
    textAlign: "center",
  },
};

export default AttemptQuizInfo;
