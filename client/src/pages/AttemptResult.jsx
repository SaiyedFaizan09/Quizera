import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";
import { getAttemptResult } from "../services/attemptService";

const AttemptResult = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError("");
      try {
        const result = await getAttemptResult(id);
        setData(result);
      } catch (err) {
        setError(err?.response?.data?.message || "Failed to load result");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [id]);

  return (
    <DashboardLayout>
      <div style={styles.wrap}>
        <button style={styles.backBtn} onClick={() => navigate("/dashboard/attempt")}>
          Back to Attempt Dashboard
        </button>

        {loading ? <div style={styles.card}>Loading result...</div> : null}
        {!loading && error ? <div style={{ ...styles.card, color: "#dc2626" }}>{error}</div> : null}

        {!loading && !error && data ? (
          <>
            <div style={styles.card}>
              <h1 style={styles.title}>{data.quiz?.title || "Quiz Result"}</h1>
              <p style={styles.subtitle}>Quiz ID: {data.quiz?.quizId}</p>
              <div style={styles.summaryRow}>
                <div style={styles.metric}>
                  <span style={styles.metricLabel}>Score</span>
                  <span style={styles.metricValue}>
                    {data.summary?.score}/{data.summary?.totalMarks}
                  </span>
                </div>
                <div style={styles.metric}>
                  <span style={styles.metricLabel}>Percentage</span>
                  <span style={styles.metricValue}>{Number(data.summary?.percentageScore || 0).toFixed(2)}%</span>
                </div>
                <div style={styles.metric}>
                  <span style={styles.metricLabel}>Submitted</span>
                  <span style={styles.metricValueSmall}>
                    {data.attempt?.submittedAt ? new Date(data.attempt.submittedAt).toLocaleString() : "N/A"}
                  </span>
                </div>
              </div>
            </div>

            <div style={styles.card}>
              <h2 style={styles.sectionTitle}>Question-wise Review</h2>
              {(data.questions || []).map((q, idx) => (
                <div key={q.questionId || idx} style={styles.questionCard}>
                  <div style={styles.questionTop}>
                    <span style={styles.questionIndex}>Q{idx + 1}</span>
                    <span style={q.isCorrect ? styles.badgeCorrect : styles.badgeWrong}>
                      {q.attempted ? (q.isCorrect ? "Correct" : "Wrong") : "Not Attempted"}
                    </span>
                  </div>
                  <p style={styles.questionText}>{q.questionText}</p>
                  <div style={styles.answerRow}>
                    <span style={styles.answerLabel}>Your answer:</span>
                    <span style={styles.answerValue}>
                      {Array.isArray(q.selectedAnswer)
                        ? q.selectedAnswer.join(", ")
                        : q.selectedAnswer || "-"}
                    </span>
                  </div>
                  <div style={styles.answerRow}>
                    <span style={styles.answerLabel}>Correct answer:</span>
                    <span style={styles.answerValue}>
                      {Array.isArray(q.correctAnswer)
                        ? q.correctAnswer.join(", ")
                        : q.correctAnswer || "-"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : null}
      </div>
    </DashboardLayout>
  );
};

const styles = {
  wrap: { maxWidth: "1000px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "16px" },
  backBtn: {
    width: "fit-content",
    border: "1px solid var(--border-light)",
    background: "var(--bg-white)",
    color: "var(--text-dark)",
    borderRadius: "8px",
    padding: "8px 12px",
    cursor: "pointer",
    fontWeight: "600",
  },
  card: {
    background: "var(--bg-white)",
    border: "1px solid var(--border-light)",
    borderRadius: "12px",
    padding: "18px",
  },
  title: { margin: 0, fontSize: "24px", color: "var(--text-dark)" },
  subtitle: { margin: "6px 0 14px", color: "var(--text-light)" },
  summaryRow: { display: "flex", gap: "12px", flexWrap: "wrap" },
  metric: {
    minWidth: "180px",
    border: "1px solid var(--border-light)",
    borderRadius: "10px",
    padding: "10px 12px",
    background: "var(--bg-light)",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  metricLabel: { fontSize: "12px", color: "var(--text-light)", fontWeight: 600, textTransform: "uppercase" },
  metricValue: { fontSize: "22px", color: "var(--text-dark)", fontWeight: 700 },
  metricValueSmall: { fontSize: "13px", color: "var(--text-dark)", fontWeight: 600 },
  sectionTitle: { margin: "0 0 12px", fontSize: "20px", color: "var(--text-dark)" },
  questionCard: {
    border: "1px solid var(--border-light)",
    borderRadius: "10px",
    padding: "12px",
    marginBottom: "10px",
  },
  questionTop: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" },
  questionIndex: { fontWeight: 700, color: "var(--text-dark)" },
  badgeCorrect: {
    background: "#dcfce7",
    color: "#166534",
    borderRadius: "999px",
    padding: "4px 10px",
    fontSize: "12px",
    fontWeight: 700,
  },
  badgeWrong: {
    background: "#fee2e2",
    color: "#991b1b",
    borderRadius: "999px",
    padding: "4px 10px",
    fontSize: "12px",
    fontWeight: 700,
  },
  questionText: { margin: "0 0 8px", color: "var(--text-dark)", fontWeight: 600 },
  answerRow: { display: "flex", gap: "8px", marginBottom: "4px" },
  answerLabel: { color: "var(--text-light)", fontSize: "13px", minWidth: "110px" },
  answerValue: { color: "var(--text-dark)", fontSize: "13px", fontWeight: 600 },
};

export default AttemptResult;
