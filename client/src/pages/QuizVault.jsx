import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";
import ToastPill from "../components/ToastPill";
import useToast from "../hooks/useToast";
import API from "../services/api";
import {
  createVault,
  getCreatorVaults,
  getParticipantVaults,
  getVaultReport,
  updateVaultQuiz,
} from "../services/vaultService";

const QuizVault = () => {
  const navigate = useNavigate();
  const isCreator = window.location.pathname.includes("/creator");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creatorVaults, setCreatorVaults] = useState([]);
  const [participantVaults, setParticipantVaults] = useState([]);
  const [allCreatorQuizzes, setAllCreatorQuizzes] = useState([]);
  const [selectedVaultId, setSelectedVaultId] = useState("");
  const [newVaultName, setNewVaultName] = useState("");
  const [selectedQuizToAdd, setSelectedQuizToAdd] = useState("");
  const { toast, showToast } = useToast();

  const selectedVault = useMemo(
    () => creatorVaults.find((v) => String(v._id) === String(selectedVaultId)) || null,
    [creatorVaults, selectedVaultId]
  );

  const loadCreatorData = async () => {
    const [vaultData, quizData] = await Promise.all([
      getCreatorVaults(),
      API.get("/quizzes", { params: { limit: 100 } }),
    ]);
    const vaults = vaultData?.vaults || [];
    setCreatorVaults(vaults);
    setAllCreatorQuizzes((quizData.data?.items || []).map((q) => ({ _id: q._id, title: q.title })));
    if (vaults.length && !selectedVaultId) setSelectedVaultId(vaults[0]._id);
  };

  const loadParticipantData = async () => {
    const data = await getParticipantVaults();
    setParticipantVaults(data?.vaults || []);
  };

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError("");
      try {
        if (isCreator) await loadCreatorData();
        else await loadParticipantData();
      } catch (err) {
        setError(err?.response?.data?.message || "Failed to load vault data");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [isCreator]);

  const handleCreateVault = async () => {
    if (!newVaultName.trim()) {
      showToast("Vault name is required");
      return;
    }
    try {
      await createVault({ name: newVaultName.trim() });
      setNewVaultName("");
      await loadCreatorData();
      showToast("Vault created successfully.", "success");
    } catch (err) {
      showToast(err?.response?.data?.message || "Failed to create vault");
    }
  };

  const handleAddQuiz = async () => {
    if (!selectedVault || !selectedQuizToAdd) return;
    try {
      await updateVaultQuiz(selectedVault._id, { action: "add", quizId: selectedQuizToAdd });
      setSelectedQuizToAdd("");
      await loadCreatorData();
      showToast("Quiz added to vault.", "success");
    } catch (err) {
      showToast(err?.response?.data?.message || "Failed to add quiz");
    }
  };

  const handleRemoveQuiz = async (quizId) => {
    if (!selectedVault) return;
    try {
      await updateVaultQuiz(selectedVault._id, { action: "remove", quizId });
      await loadCreatorData();
      showToast("Quiz removed from vault.", "success");
    } catch (err) {
      showToast(err?.response?.data?.message || "Failed to remove quiz");
    }
  };

  const handleDownloadReport = async () => {
    if (!selectedVault) return;
    try {
      const data = await getVaultReport(selectedVault._id);
      const blob = new Blob([data.csv || ""], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${selectedVault.name.replace(/\s+/g, "_")}_report.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showToast("Vault report downloaded.", "success");
    } catch (err) {
      showToast(err?.response?.data?.message || "Failed to download report");
    }
  };

  return (
    <DashboardLayout>
      <div style={styles.wrap}>
        <ToastPill toast={toast} />
        <div style={styles.titleRow}>
          <h1 style={styles.title}>{isCreator ? "Quiz Vault - Creator" : "Quiz Vault - Participant"}</h1>
          <button style={styles.topBackBtn} onClick={() => navigate(-1)}>
            <span aria-hidden="true">←</span>
            <span>Back</span>
          </button>
        </div>
        <p style={styles.subtitle}>
          {isCreator
            ? "Create vaults, group your quizzes, and download vault-wise reports."
            : "See automatic vault analysis for quizzes you attempted."}
        </p>

        {loading ? <div style={styles.panel}>Loading...</div> : null}
        {!loading && error ? <div style={{ ...styles.panel, color: "#dc2626" }}>{error}</div> : null}

        {!loading && !error && isCreator ? (
          <div style={styles.grid}>
            <div style={styles.panel}>
              <h3 style={styles.heading}>Create Vault</h3>
              <input
                style={styles.input}
                placeholder="Vault name"
                value={newVaultName}
                onChange={(e) => setNewVaultName(e.target.value)}
              />
              <button style={styles.primaryBtn} onClick={handleCreateVault}>
                Create Vault
              </button>

              <h3 style={{ ...styles.heading, marginTop: "16px" }}>Your Vaults</h3>
              {(creatorVaults || []).map((v) => (
                <button
                  key={v._id}
                  style={{
                    ...styles.vaultItem,
                    ...(String(selectedVaultId) === String(v._id) ? styles.vaultItemActive : {}),
                  }}
                  onClick={() => setSelectedVaultId(v._id)}
                >
                  {v.name} ({v.quizzes?.length || 0})
                </button>
              ))}
            </div>

            <div style={styles.panel}>
              <h3 style={styles.heading}>Vault Details</h3>
              {!selectedVault ? (
                <p style={styles.muted}>Select a vault from left.</p>
              ) : (
                <>
                  <p style={styles.muted}>{selectedVault.description || "No description"}</p>
                  <div style={styles.inlineRow}>
                    <select
                      style={styles.inlineSelect}
                      value={selectedQuizToAdd}
                      onChange={(e) => setSelectedQuizToAdd(e.target.value)}
                    >
                      <option value="">Select quiz to add</option>
                      {allCreatorQuizzes
                        .filter((q) => !(selectedVault.quizzes || []).some((vq) => String(vq._id) === String(q._id)))
                        .map((q) => (
                          <option key={q._id} value={q._id}>
                            {q.title}
                          </option>
                        ))}
                    </select>
                    <button style={styles.secondaryBtn} onClick={handleAddQuiz}>
                      Add Quiz
                    </button>
                  </div>
                  <button style={{ ...styles.primaryBtn, ...styles.downloadReportBtn }} onClick={handleDownloadReport}>
                    Download Vault Report (CSV)
                  </button>

                  <div style={{ marginTop: "14px" }}>
                    {(selectedVault.quizzes || []).length ? (
                      selectedVault.quizzes.map((q) => (
                        <div key={q._id} style={styles.quizRow}>
                          <span>{q.title}</span>
                          <button style={styles.removeBtn} onClick={() => handleRemoveQuiz(q._id)}>
                            Remove
                          </button>
                        </div>
                      ))
                    ) : (
                      <p style={styles.muted}>No quizzes in this vault yet.</p>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        ) : null}

        {!loading && !error && !isCreator ? (
          <div style={styles.panel}>
            {(participantVaults || []).length ? (
              participantVaults.map((v) => (
                <div key={v._id} style={styles.participantVaultCard}>
                  <h3 style={{ margin: "0 0 6px" }}>{v.name}</h3>
                  <p style={styles.muted}>{v.description || "No description"}</p>
                  <p style={styles.analyticsLine}>
                    Attempted: {v.analytics?.attemptedCount || 0} quizzes | Total Score: {v.analytics?.totalScore || 0} |
                    Avg %: {Number(v.analytics?.averagePercentage || 0).toFixed(2)}%
                  </p>
                  {(v.quizzes || []).map((q) => (
                    <div key={q.quizId} style={styles.quizRow}>
                      <span>{q.quizTitle}</span>
                      <span>
                        {q.score} ({Number(q.percentageScore || 0).toFixed(2)}%)
                      </span>
                    </div>
                  ))}
                </div>
              ))
            ) : (
              <p style={styles.muted}>No vault analysis available yet. Attempt quizzes that are part of creator vaults.</p>
            )}
          </div>
        ) : null}

      </div>
    </DashboardLayout>
  );
};

const styles = {
  wrap: { maxWidth: "1100px", margin: 0 },
  titleRow: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", marginBottom: "8px" },
  title: { fontSize: "24px", fontWeight: "700", color: "var(--text-dark)", margin: 0 },
  subtitle: { fontSize: "15px", color: "var(--text-light)", margin: "0 0 24px 0" },
  grid: { display: "grid", gridTemplateColumns: "360px 1fr", gap: "14px", marginBottom: "14px" },
  panel: {
    background: "var(--bg-white)",
    border: "1px solid var(--border-light)",
    borderRadius: "12px",
    padding: "14px",
  },
  heading: { margin: "0 0 10px", color: "var(--text-dark)", fontSize: "17px" },
  input: {
    width: "100%",
    border: "1px solid var(--border-light)",
    borderRadius: "8px",
    padding: "10px",
    marginBottom: "8px",
    fontSize: "13px",
    boxSizing: "border-box",
  },
  inlineRow: { display: "flex", gap: "8px", alignItems: "center", flexWrap: "nowrap" },
  inlineSelect: {
    flex: 1,
    border: "1px solid var(--border-light)",
    borderRadius: "8px",
    padding: "8px 10px",
    fontSize: "13px",
    boxSizing: "border-box",
    marginBottom: 0,
    minWidth: 0,
  },
  primaryBtn: {
    border: "none",
    background: "linear-gradient(135deg, #06b6d4 0%, #7c3aed 100%)",
    color: "#fff",
    borderRadius: "8px",
    padding: "10px 12px",
    fontWeight: "600",
    cursor: "pointer",
    marginBottom: "6px",
  },
  downloadReportBtn: {
    marginTop: "4px",
  },
  secondaryBtn: {
    border: "1px solid var(--border-light)",
    background: "var(--bg-white)",
    color: "var(--text-dark)",
    borderRadius: "8px",
    padding: "8px 12px",
    fontWeight: "600",
    cursor: "pointer",
    whiteSpace: "nowrap",
    boxShadow: "none",
    width: "fit-content",
    minWidth: "unset",
    flex: "0 0 auto",
  },
  removeBtn: {
    border: "none",
    background: "#fff",
    color: "#b91c1c",
    borderRadius: "6px",
    padding: "2px 4px",
    fontWeight: "500",
    cursor: "pointer",
    fontSize: "11px",
    lineHeight: 1.1,
    width: "fit-content",
    minWidth: "unset",
    whiteSpace: "nowrap",
    flex: "0 0 auto",
    boxShadow: "none",
  },
  vaultItem: {
    width: "100%",
    textAlign: "left",
    border: "1px solid var(--border-light)",
    background: "var(--bg-white)",
    color: "var(--text-dark)",
    borderRadius: "8px",
    padding: "8px 10px",
    marginBottom: "6px",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "13px",
    boxShadow: "none",
    appearance: "none",
  },
  vaultItemActive: {
    border: "1px solid #06b6d4",
    background: "#ecfeff",
    color: "#0f766e",
  },
  quizRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 0",
    borderBottom: "1px solid var(--border-light)",
    fontSize: "13px",
    color: "var(--text-dark)",
    gap: "10px",
  },
  muted: { color: "var(--text-light)", fontSize: "13px" },
  participantVaultCard: {
    border: "1px solid var(--border-light)",
    borderRadius: "10px",
    padding: "12px",
    marginBottom: "10px",
    background: "#fff",
  },
  analyticsLine: { margin: "6px 0 10px", fontSize: "13px", color: "var(--text-dark)", fontWeight: 600 },
  topBackBtn: {
    border: "none",
    background: "transparent",
    color: "var(--text-dark)",
  outline: "none",
  boxShadow: "none",
    cursor: "pointer",
    fontWeight: "500",
    fontSize: "13px",
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: 0,
    width: "fit-content",
    minWidth: "unset",
    flex: "0 0 auto",
    whiteSpace: "nowrap",
  },
};

export default QuizVault;
