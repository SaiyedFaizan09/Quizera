import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";
import API from "../services/api";
import { FaPlus, FaFolderOpen, FaSearch, FaClock, FaInbox } from "react-icons/fa";

const CreateDashboard = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const run = async (isBackgroundRefresh = false) => {
      if (!isBackgroundRefresh && mounted) setLoading(true);
      try {
        const { data } = await API.get("/quizzes", {
          params: { limit: 50 },
        });

        const mappedRows = Array.isArray(data?.items)
          ? data.items.map((item, index) => ({
              _id: item._id,
              sr: Number(item.sr) || index + 1,
              title: String(item.title || "Untitled Quiz"),
              status: ["live", "scheduled", "closed"].includes(item.status) ? item.status : "closed",
              lastUpdated: String(item.lastUpdated || ""),
            }))
          : [];

        if (mounted) setRows(mappedRows);
      } catch {
        if (mounted) setRows([]);
      } finally {
        if (mounted && !isBackgroundRefresh) setLoading(false);
      }
    };

    run();
    const intervalId = setInterval(() => {
      run(true);
    }, 15000);

    return () => {
      mounted = false;
      clearInterval(intervalId);
    };
  }, []);

  const handleCreateNewQuiz = () => navigate("/create-quiz");
  const handleQuizVault = () => navigate("/quiz-vault/creator");

  const filteredQuizzes = rows.filter((row) => {
    const q = search.toLowerCase();
    const statusLabel =
      row.status === "live" ? "live" :
      row.status === "scheduled" ? "scheduled" : "closed";
    return (
      row.title.toLowerCase().includes(q) ||
      statusLabel.includes(q)
    );
  });

  return (
    <DashboardLayout>
      <div style={styles.wrap}>
        {/* Welcome Section (matched to AttemptDashboard style) */}
        <div style={styles.welcomeSectionCreator}>
          <div style={styles.welcomeContent}>
            <h1 style={styles.pageTitle}>Creator Dashboard</h1>
            <p style={styles.subtitle}>Create quizzes and manage your past created quizzes.</p>
          </div>
          <div style={styles.welcomeIcon}>
            <FaPlus size={40} />
          </div>
        </div>

        {/* Quick Actions */}
        <section style={styles.section}>
          <div style={styles.actionGrid}>
            <button
              style={{ ...styles.actionCard, ...styles.primaryAction }}
              onClick={handleCreateNewQuiz}
            >
              <div style={{ ...styles.actionIcon, background: "linear-gradient(135deg, #06b6d4 0%, #7c3aed 100%)" }}>
                <FaPlus size={24} />
              </div>
              <div style={styles.actionInfo}>
                <h3 style={styles.actionTitle}>Create New Quiz</h3>
                <p style={styles.actionDesc}>Start creating a new quiz</p>
              </div>
            </button>

            <button
              style={{ ...styles.actionCard, ...styles.secondaryAction }}
              onClick={handleQuizVault}
            >
              <div style={{ ...styles.actionIcon, background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)" }}>
                <FaFolderOpen size={24} />
              </div>
              <div style={styles.actionInfo}>
                <h3 style={styles.actionTitle}>Quiz Vault</h3>
                <p style={styles.actionDesc}>Manage your quizzes</p>
              </div>
            </button>
          </div>
        </section>

        <section style={styles.section}>
          <div style={styles.tableHeader}>
            <h2 style={styles.sectionTitle}>Past created quizzes</h2>
            <div style={styles.searchBox}>
              <FaSearch size={14} style={{ marginRight: "8px", color: "var(--text-light)" }} />
              <input
                type="text"
                placeholder="Search by Title or Status..."
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
                  <th style={{ ...styles.th, width: "60px" }}>Sr. no.</th>
                  <th style={{ ...styles.th, width: "auto" }}>Title</th>
                  <th style={{ ...styles.th, ...styles.thCenter, width: "130px" }}>Status</th>
                  <th style={{ ...styles.th, ...styles.thCenter, width: "150px" }}>Last Updated</th>
                  <th style={{ ...styles.th, ...styles.thCenter, width: "140px" }}>Manage quiz</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} style={styles.emptyCell}>
                      <div style={styles.emptyState}>
                        <FaInbox size={36} style={{ color: "var(--text-light)", marginBottom: "12px" }} />
                        <p style={styles.emptyTitle}>Loading quizzes...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredQuizzes.length > 0 ? (
                  filteredQuizzes.map((row) => (
                    <tr key={row._id} style={styles.tr}>
                      <td style={{ ...styles.td, ...styles.tdSrNo, width: "60px" }}>
                        <span style={styles.srNumber}>{row.sr}</span>
                      </td>
                      <td style={{ ...styles.td, ...styles.tdTitle, width: "auto" }}>
                        <span style={styles.quizTitle}>{row.title}</span>
                      </td>
                      <td style={{ ...styles.td, ...styles.tdCompact, ...styles.tdCenter, width: "130px" }}>
                        <span style={{ ...styles.badge, ...styles[`status_${row.status}`] }}>
                          {row.status === "live"      ? "Live"      :
                           row.status === "scheduled" ? "Scheduled" : "Closed"}
                        </span>
                      </td>
                      <td style={{ ...styles.td, ...styles.tdCompact, ...styles.tdCenter, width: "150px" }}>
                        <div style={styles.dateCell}>
                          <FaClock size={12} style={{ marginRight: "6px", color: "var(--text-light)" }} />
                          {row.lastUpdated}
                        </div>
                      </td>
                      <td style={{ ...styles.td, ...styles.tdCompact, ...styles.tdCenter, width: "140px" }}>
                        <button
                          type="button"
                          style={styles.viewBtn}
                          onClick={() => navigate(`/manage-quiz/${row._id}`)}
                        >
                          Manage
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
    </DashboardLayout>
  );
};

const styles = {
  wrap: {
    maxWidth: "1200px",
    margin: "0 auto",
  },
  welcomeSectionCreator: {
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
    minWidth: "420px",
  },
  searchInput: {
    border: "none",
    background: "transparent",
    outline: "none",
    fontSize: "13px",
    color: "var(--text-dark)",
    width: "378px",
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
    justifyContent: "center",
    width: "90px",
    padding: "6px 0",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: "500",
  },
  status_scheduled: { background: "#fef3c7", color: "#d97706" },
  status_live:      { background: "#d1fae5", color: "#059669" },
  status_closed:    { background: "#e5e7eb", color: "#374151" },
  viewBtn: {
    padding: "8px 16px",
    borderRadius: "8px",
    border: "none",
    background: "linear-gradient(135deg, #06b6d4 0%, #7c3aed 100%)",
    color: "#fff",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.2s ease",
    whiteSpace: "nowrap",
    boxShadow: "0 4px 10px rgba(7, 89, 133, 0.18)",
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
};

export default CreateDashboard;
