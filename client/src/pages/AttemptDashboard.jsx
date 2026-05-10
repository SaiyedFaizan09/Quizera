import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";
import { useUser } from "../context/UserContext";
import ToastPill from "../components/ToastPill";
import useToast from "../hooks/useToast";
import { FaPlus, FaFolderOpen, FaSearch, FaClock, FaChartBar, FaCheckCircle, FaInbox } from "react-icons/fa";
import { getMyAttempts, verifyAttemptAccess } from "../services/attemptService";

const AttemptDashboard = () => {
  const navigate = useNavigate();
  const { userName } = useUser();
  const [popupOpen, setPopupOpen] = useState(false);
  const [quizCode, setQuizCode] = useState("");
  const [quizPass, setQuizPass] = useState("");
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [search, setSearch] = useState("");
  const [attempts, setAttempts] = useState([]);
  const [loadingAttempts, setLoadingAttempts] = useState(true);
  const [tableError, setTableError] = useState("");
  const { toast, showToast } = useToast();

  useEffect(() => {
    const loadAttempts = async () => {
      setLoadingAttempts(true);
      setTableError("");
      try {
        const data = await getMyAttempts();
        setAttempts(data?.attempts || []);
      } catch (err) {
        setTableError(err?.response?.data?.message || "Failed to load attempted quizzes");
      } finally {
        setLoadingAttempts(false);
      }
    };
    loadAttempts();
  }, []);

  const filteredAttempts = attempts.filter((row) => {
    const q = search.toLowerCase();
    const resultLabel = row.result === "Published" ? "published" : "not published";
    return (
      row.title.toLowerCase().includes(q) ||
      resultLabel.includes(q)
    );
  });

  const handleAttemptNewQuiz = () => setPopupOpen(true);

  const handleConfirmAttempt = async (e) => {
    e.preventDefault();
    setError("");
    if (!quizCode.trim() || !quizPass.trim()) {
      setError("Enter Quiz Code and Quiz Pass.");
      return;
    }
    try {
      setConfirming(true);
      const payload = {
        quizCode: quizCode.trim(),
        quizPass: quizPass.trim(),
      };
      const data = await verifyAttemptAccess(payload);

      if (data?.alreadyAttempted) {
        setError("You have already submitted this quiz.");
        return;
      }
      if (!data?.canAttempt) {
        setError("This quiz is not available for attempt.");
        return;
      }

      setPopupOpen(false);
      setQuizCode("");
      setQuizPass("");
      navigate("/attempt-quiz/info", {
        state: {
          ...payload,
          participantName: userName,
          quiz: data.quiz,
          existingAttemptId: data.existingAttemptId,
        },
      });
    } catch (err) {
      setError(err?.response?.data?.message || "Quiz verification failed");
    } finally {
      setConfirming(false);
    }
  };

  const handleQuizVault = () => navigate("/quiz-vault");

  return (
    <DashboardLayout>
      <ToastPill toast={toast} />
      <div style={styles.wrap}>
        {/* Welcome Section */}
        <div style={styles.welcomeSection}>
          <div style={styles.welcomeContent}>
            <h1 style={styles.pageTitle}>Welcome back, {userName}!</h1>
            <p style={styles.subtitle}>Ready to test your knowledge? Attempt new quizzes or explore your past attempts.</p>
          </div>
          <div style={styles.welcomeIcon}>
            <FaChartBar size={48} />
          </div>
        </div>

        {/* Quick Actions */}
        <section style={styles.section}>
          <div style={styles.actionGrid}>
            <button 
              style={{...styles.actionCard, ...styles.primaryAction}} 
              onClick={handleAttemptNewQuiz}
            >
              <div style={{...styles.actionIcon, background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"}}>
                <FaPlus size={24} />
              </div>
              <div style={styles.actionInfo}>
                <h3 style={styles.actionTitle}>Attempt New Quiz</h3>
                <p style={styles.actionDesc}>Enter a quiz code to start</p>
              </div>
            </button>

            <button 
              style={{...styles.actionCard, ...styles.secondaryAction}} 
              onClick={handleQuizVault}
            >
              <div style={{...styles.actionIcon, background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"}}>
                <FaFolderOpen size={24} />
              </div>
              <div style={styles.actionInfo}>
                <h3 style={styles.actionTitle}>Quiz Vault</h3>
                <p style={styles.actionDesc}>Browse available quizzes</p>
              </div>
            </button>
          </div>
        </section>

        {/* Stats Cards removed as per design request */}

        {/* Past Attempts Table */}
        <section style={styles.section}>
          <div style={styles.tableHeader}>
            <h2 style={styles.sectionTitle}>Past Attempted Quizzes</h2>
            <div style={styles.searchBox}>
              <FaSearch size={14} style={{marginRight: "8px", color: "var(--text-light)"}} />
              <input 
                type="text" 
                placeholder="Search by Title or Result..." 
                style={styles.searchInput}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={{...styles.th, width: "60px"}}>Sr. no.</th>
                  <th style={{...styles.th, width: "auto"}}>Title</th>
                  <th style={{...styles.th, ...styles.thCenter, width: "140px"}}>Attempt Date</th>
                  <th style={{...styles.th, ...styles.thCenter, width: "110px"}}>Result</th>
                  <th style={{...styles.th, ...styles.thCenter, width: "120px"}}>Action</th>
                </tr>
              </thead>
              <tbody>
                {loadingAttempts ? (
                  <tr>
                    <td colSpan={5} style={styles.emptyCell}>
                      <div style={styles.emptyState}>
                        <p style={styles.emptyTitle}>Loading attempts...</p>
                      </div>
                    </td>
                  </tr>
                ) : tableError ? (
                  <tr>
                    <td colSpan={5} style={styles.emptyCell}>
                      <div style={styles.emptyState}>
                        <p style={styles.emptyTitle}>{tableError}</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredAttempts.length > 0 ? (
                  filteredAttempts.map((row) => (
                    <tr key={row._id || row.sr} style={styles.tr}>
                      <td style={{...styles.td, ...styles.tdSrNo, width: "60px"}}>
                        <span style={styles.srNumber}>{row.sr}</span>
                      </td>
                      <td style={{...styles.td, ...styles.tdTitle, width: "auto"}}>
                        <span style={styles.quizTitle}>{row.title}</span>
                      </td>
                      <td style={{...styles.td, ...styles.tdCompact, ...styles.tdCenter, width: "140px"}}>
                        <div style={styles.dateCell}>
                          <FaClock size={12} style={{marginRight: "6px", color: "var(--text-light)"}} />
                          {row.attemptDate}
                        </div>
                      </td>
                      <td style={{...styles.td, ...styles.tdCompact, ...styles.tdCenter, width: "110px"}}>
                        <span style={{
                          ...styles.badge,
                          ...(row.result === "Published" ? styles.badgeSuccess : styles.badgeWarning)
                        }}>
                          {row.result === "Published" ? "Published" : "Pending"}
                        </span>
                      </td>
                      <td style={{...styles.td, ...styles.tdCompact, ...styles.tdCenter, width: "120px"}}>
                        <button
                          style={styles.viewBtn}
                          onClick={() => {
                            if (row.status === "in-progress") {
                              navigate(`/attempt-quiz/${row._id}`);
                              return;
                            }
                            if (row.result !== "Published") {
                              showToast("Result is not published by quiz creator yet.");
                              return;
                            }
                            navigate(`/attempt-result/${row._id}`);
                          }}
                        >
                          {row.status === "in-progress" ? "Resume" : "View"}
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} style={styles.emptyCell}>
                      <div style={styles.emptyState}>
                        <FaInbox size={36} style={{ color: "var(--text-light)", marginBottom: "12px" }} />
                        <p style={styles.emptyTitle}>No quizzes found</p>
                        <p style={styles.emptySubtitle}>No results for "<strong>{search}</strong>". Try a different name.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Popup Modal */}
      {popupOpen && (
        <div style={styles.overlay} onClick={() => setPopupOpen(false)}>
          <div style={styles.popup} onClick={(e) => e.stopPropagation()}>
            <div style={styles.popupHeader}>
              <div style={styles.popupIcon}>
                <FaSearch size={20} />
              </div>
              <h2 style={styles.popupTitle}>Attempt New Quiz</h2>
            </div>
            <p style={styles.popupNote}>
              Enter the Quiz Code and Quiz Pass provided by the organizer to begin your attempt.
            </p>
            <div style={styles.privacyNotice}>
              <div style={styles.privacyIcon}>ℹ️</div>
              <span>Your name will be visible to the quiz organizer</span>
            </div>
            {error && <div style={styles.popupError}>{error}</div>}
            <form onSubmit={handleConfirmAttempt} style={styles.form}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Quiz Code</label>
                <input
                  type="text"
                  placeholder="Enter quiz code"
                  value={quizCode}
                  onChange={(e) => setQuizCode(e.target.value)}
                  style={styles.input}
                  autoFocus
                />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Quiz Pass</label>
                <input
                  type="password"
                  placeholder="Enter quiz password"
                  value={quizPass}
                  onChange={(e) => setQuizPass(e.target.value)}
                  style={styles.input}
                />
              </div>
              <div style={styles.popupActions}>
                <button 
                  type="button" 
                  style={styles.cancelBtn}
                  onClick={() => setPopupOpen(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  style={styles.submitBtn}
                  disabled={confirming}
                >
                  {confirming ? "Verifying..." : "Start Quiz"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

const styles = {
  wrap: {
    maxWidth: "1200px",
    margin: "0 auto",
  },
  welcomeSection: {
    background: "linear-gradient(135deg, #06b6d4 0%, #7c3aed 100%)",
    borderRadius: "16px",
    padding: "24px",
    marginBottom: "20px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    color: "#fff",
    boxShadow: "0 8px 20px rgba(7, 89, 133, 0.08)",
  },
  welcomeContent: {
    flex: 1,
  },
  pageTitle: {
    fontSize: "26px",
    fontWeight: "700",
    margin: "0 0 8px 0",
  },
  subtitle: {
    fontSize: "14px",
    opacity: 0.95,
    margin: 0,
  },
  welcomeIcon: {
    opacity: 0.95,
    marginLeft: "16px",
  },
  section: {
    marginBottom: "24px",
  },
  actionGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: "16px",
  },
  actionCard: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    padding: "16px",
    borderRadius: "12px",
    border: "none",
    cursor: "pointer",
    transition: "all 0.15s ease",
    textAlign: "left",
    background: "var(--bg-white)",
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
  },
  primaryAction: {},
  secondaryAction: {},
  actionIcon: {
    width: "48px",
    height: "48px",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
  },
  actionInfo: {
    flex: 1,
  },
  actionTitle: {
    fontSize: "16px",
    fontWeight: "600",
    color: "var(--text-dark)",
    margin: "0 0 4px 0",
  },
  actionDesc: {
    fontSize: "13px",
    color: "var(--text-light)",
    margin: 0,
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "16px",
  },
  statCard: {
    background: "var(--bg-white)",
    borderRadius: "14px",
    padding: "20px",
    display: "flex",
    alignItems: "center",
    gap: "16px",
    border: "1px solid var(--border-light)",
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
  },
  statIcon: {
    width: "44px",
    height: "44px",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#dbeafe",
    color: "#2563eb",
  },
  statContent: {
    display: "flex",
    flexDirection: "column",
  },
  statValue: {
    fontSize: "24px",
    fontWeight: "700",
    color: "var(--text-dark)",
  },
  statLabel: {
    fontSize: "13px",
    color: "var(--text-light)",
  },
  tableHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "12px",
    gap: "12px",
  },
  sectionTitle: {
    fontSize: "18px",
    fontWeight: "600",
    color: "var(--text-dark)",
    margin: 0,
  },
  searchBox: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "6px 10px",
    background: "var(--bg-white)",
    borderRadius: "10px",
    border: "none",
    boxShadow: "0 4px 12px rgba(15, 23, 42, 0.04)",
    minWidth: "350px",
  },
  searchInput: {
    border: "none",
    background: "transparent",
    outline: "none",
    fontSize: "13px",
    color: "var(--text-dark)",
    width: "300px",
    height: "28px",
    lineHeight: "28px",
  },
  tableWrap: {
    background: "var(--bg-white)",
    borderRadius: "12px",
    border: "1px solid var(--border-light)",
    overflow: "hidden",
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    tableLayout: "auto",
  },
  th: {
    textAlign: "left",
    padding: "12px 16px",
    fontWeight: "600",
    fontSize: "12px",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    color: "var(--text-light)",
    background: "var(--bg-light)",
    borderBottom: "1px solid var(--border-light)",
  },
  thCenter: {
    textAlign: "center",
  },
  td: {
    padding: "14px 16px",
    borderBottom: "1px solid var(--border-light)",
    fontSize: "14px",
    color: "var(--text-dark)",
  },
  tdSrNo: {
    padding: "14px 12px",
  },
  tdTitle: {
    padding: "14px 16px",
  },
  tdCompact: {
    padding: "14px 8px",
  },
  tdCenter: {
    textAlign: "center",
  },
  tr: {
    transition: "background 0.15s ease",
  },
  srNumber: {
    width: "32px",
    height: "32px",
    borderRadius: "8px",
    background: "var(--bg-light)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "600",
    fontSize: "13px",
  },
  quizTitle: {
    fontWeight: "500",
  },
  dateCell: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "var(--text-light)",
    fontSize: "13px",
  },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    padding: "6px 12px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: "500",
  },
  badgeSuccess: {
    background: "#d1fae5",
    color: "#059669",
  },
  badgeWarning: {
    background: "#fef3c7",
    color: "#d97706",
  },
  viewBtn: {
    padding: "8px 16px",
    borderRadius: "6px",
    border: "1px solid var(--border-light)",
    background: "#fff",
    color: "var(--text-dark)",
    fontSize: "13px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "all 0.2s ease",
    whiteSpace: "nowrap",
    boxShadow: "inset 0 2px 4px rgba(0, 0, 0, 0.06)",
    width: "fit-content",
  },
  emptyCell: {
    padding: 0,
    border: "none",
  },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "48px 24px",
  },
  emptyTitle: {
    fontSize: "16px",
    fontWeight: "600",
    color: "var(--text-dark)",
    margin: "0 0 6px 0",
  },
  emptySubtitle: {
    fontSize: "13px",
    color: "var(--text-light)",
    margin: 0,
  },
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0,0,0,0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: "20px",
  },
  popup: {
    background: "var(--bg-white)",
    borderRadius: "16px",
    padding: "28px",
    width: "100%",
    maxWidth: "420px",
    boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
  },
  popupHeader: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "16px",
  },
  popupIcon: {
    width: "40px",
    height: "40px",
    borderRadius: "10px",
    background: "#dbeafe",
    color: "#2563eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  popupTitle: {
    fontSize: "20px",
    fontWeight: "600",
    color: "var(--text-dark)",
    margin: 0,
  },
  popupNote: {
    fontSize: "14px",
    color: "var(--text-light)",
    margin: "0 0 20px 0",
    lineHeight: "1.5",
  },
  privacyNotice: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 12px",
    borderRadius: "6px",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    fontSize: "12px",
    color: "#64748b",
    marginBottom: "16px",
    fontWeight: "400",
  },
  privacyIcon: {
    fontSize: "14px",
  },
  popupError: {
    background: "#fee2e2",
    color: "#dc2626",
    padding: "12px 16px",
    borderRadius: "8px",
    fontSize: "14px",
    marginBottom: "16px",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  label: {
    fontSize: "13px",
    fontWeight: "500",
    color: "var(--text-dark)",
  },
  input: {
    width: "100%",
    padding: "12px 16px",
    borderRadius: "10px",
    border: "1px solid var(--border-light)",
    background: "var(--bg-white)",
    color: "var(--text-dark)",
    fontSize: "14px",
    transition: "all 0.15s ease",
  },
  popupActions: {
    display: "flex",
    gap: "12px",
    marginTop: "8px",
  },
  cancelBtn: {
    flex: 1,
    padding: "12px",
    borderRadius: "10px",
    border: "1px solid var(--border-light)",
    background: "var(--bg-white)",
    color: "var(--text-dark)",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  submitBtn: {
    flex: 1,
    padding: "12px",
    borderRadius: "10px",
    border: "none",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    color: "#fff",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
};

export default AttemptDashboard;
