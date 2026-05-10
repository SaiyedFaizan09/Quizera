import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";
import * as quizManageService from "../services/quizManageService";
import ToastPill from "../components/ToastPill";
import useToast from "../hooks/useToast";
import { FaExclamationTriangle, FaSpinner, FaArrowLeft } from "react-icons/fa";
import "../styles/manageQuiz.css";

const ManageQuiz = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [overview, setOverview] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({});
  const [confirmDialog, setConfirmDialog] = useState({ open: false, action: null });
  const { toast, showToast } = useToast();

  useEffect(() => {
    loadOverview();
  }, [id]);

  const loadOverview = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log("[Frontend] Loading overview for quiz ID:", id);
      const data = await quizManageService.getOverview(id);
      console.log("[Frontend] Overview data received:", data);
      setOverview(data);
      setEditData(data.quiz || {});
    } catch (err) {
      console.error("[Frontend] Error loading overview:", err);
      console.error("[Frontend] Error response:", err.response);
      setError(err.response?.data?.message || "Failed to load quiz");
    } finally {
      setLoading(false);
    }
  };

  const loadQuestions = async () => {
    try {
      const data = await quizManageService.getQuestions(id);
      setQuestions(data.questions || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load questions");
    }
  };

  const loadResponses = async () => {
    try {
      const data = await quizManageService.getResponses(id);
      setResponses(data.responses || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load responses");
    }
  };

  useEffect(() => {
    if (activeTab === "questions" && questions.length === 0) {
      loadQuestions();
    } else if (activeTab === "responses" && responses.length === 0) {
      loadResponses();
    }
  }, [activeTab]);

  const handleStatusChange = async (newStatus) => {
    try {
      const result = await quizManageService.updateStatus(id, newStatus);
      // Update editData with the new quiz data from backend
      if (result.quiz) {
        setEditData(result.quiz);
      }
      loadOverview();
      setConfirmDialog({ open: false, action: null });
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to update status");
    }
  };

  const handleDelete = async () => {
    try {
      await quizManageService.softDelete(id);
      navigate("/dashboard/create");
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to delete quiz");
    }
  };

  const handlePublishResults = async (published) => {
    try {
      await quizManageService.publishResults(id, published);
      await loadResponses();
      await loadOverview();
      setConfirmDialog({ open: false, action: null });
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to update result publishing");
    }
  };

  const handleSaveEdit = async () => {
    try {
      const result = await quizManageService.updateQuiz(id, editData);
      setEditMode(false);
      // Update editData with the saved quiz data
      if (result.quiz) {
        setEditData(result.quiz);
      }
      loadOverview();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to update quiz");
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <ToastPill toast={toast} />
        <div style={styles.loadingContainer}>
          <FaSpinner style={styles.spinner} />
          <p>Loading quiz...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <ToastPill toast={toast} />
        <div style={styles.errorContainer}>
          <FaExclamationTriangle style={styles.errorIcon} />
          <p>{error}</p>
          <button style={styles.primaryBtn} onClick={loadOverview}>
            Retry
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const quiz = overview?.quiz || {};
  const analytics = overview?.analytics || {};

  return (
    <DashboardLayout>
      <ToastPill toast={toast} />
      <div style={styles.container}>
        <button 
          style={styles.backBtn} 
          onClick={() => navigate("/dashboard/create")}
          title="Back to Dashboard"
        >
          <FaArrowLeft style={styles.backIcon} />
          Back
        </button>
        
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>{quiz.title || "Untitled Quiz"}</h2>
            <p style={styles.subtitle}>Quiz ID: {quiz.quizId}</p>
          </div>
          <div style={styles.headerActions}>
            <span style={{ ...styles.statusBadge, ...styles[`status${quiz.status}`] }}>
              {quiz.status}
            </span>
            <button
              style={styles.dangerBtn}
              onClick={() => setConfirmDialog({ open: true, action: "delete" })}
            >
              Delete Quiz
            </button>
          </div>
        </div>

        <div style={styles.tabs}>
          {["overview", "questions", "responses", "edit"].map((tab) => (
            <button
              key={tab}
              style={{
                ...styles.tab,
                ...(activeTab === tab ? styles.activeTab : {}),
              }}
              onClick={() => setActiveTab(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        <div style={styles.content}>
          {activeTab === "overview" && <OverviewTab quiz={quiz} analytics={analytics} />}
          {activeTab === "questions" && <QuestionsTab questions={questions} />}
          {activeTab === "responses" && (
            <ResponsesTab
              responses={responses}
              onPublish={(published) =>
                setConfirmDialog({ open: true, action: "publish", data: published })
              }
            />
          )}
          {activeTab === "edit" && (
            <EditTab
              quiz={quiz}
              editData={editData}
              setEditData={setEditData}
              onSave={handleSaveEdit}
              onToast={showToast}
              onStatusChange={(status) =>
                setConfirmDialog({ open: true, action: "status", data: status })
              }
            />
          )}
        </div>

        {confirmDialog.open && (
          <ConfirmDialog
            action={confirmDialog.action}
            data={confirmDialog.data}
            onConfirm={() => {
              if (confirmDialog.action === "delete") handleDelete();
              else if (confirmDialog.action === "status")
                handleStatusChange(confirmDialog.data);
              else if (confirmDialog.action === "publish")
                handlePublishResults(!!confirmDialog.data);
            }}
            onCancel={() => setConfirmDialog({ open: false, action: null })}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

const OverviewTab = ({ quiz, analytics }) => (
  <div style={styles.overviewGrid}>
    <section style={styles.section}>
      <h3 style={styles.sectionTitle}>Quiz Details</h3>
      <div style={styles.infoRow}>
        <span style={styles.label}>Title:</span>
        <span style={styles.value}>{quiz.title}</span>
      </div>
      <div style={styles.infoRow}>
        <span style={styles.label}>Description:</span>
        <span style={styles.value}>{quiz.description || "No description"}</span>
      </div>
      <div style={styles.infoRow}>
        <span style={styles.label}>Total Questions:</span>
        <span style={styles.value}>{quiz.totalQuestions || 0}</span>
      </div>
      <div style={styles.infoRow}>
        <span style={styles.label}>Total Marks:</span>
        <span style={styles.value}>{quiz.totalMarks || 0}</span>
      </div>
    </section>

    <section style={styles.section}>
      <h3 style={styles.sectionTitle}>Timing & Rules</h3>
      <div style={styles.infoRow}>
        <span style={styles.label}>Timed Quiz:</span>
        <span style={styles.value}>{quiz.timedQuiz ? "Yes" : "No"}</span>
      </div>
      {quiz.timedQuiz && (
        <>
          <div style={styles.infoRow}>
            <span style={styles.label}>Timing Mode:</span>
            <span style={styles.value}>{quiz.wholeOrPerQuestion}</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.label}>Duration:</span>
            <span style={styles.value}>
              {quiz.wholeOrPerQuestion === "whole"
                ? `${quiz.wholeDurationMinutes} min`
                : `${quiz.pqtDefaultSeconds} sec/question`}
            </span>
          </div>
        </>
      )}
      <div style={styles.infoRow}>
        <span style={styles.label}>Shuffle Questions:</span>
        <span style={styles.value}>{quiz.shuffle ? "Yes" : "No"}</span>
      </div>
      <div style={styles.infoRow}>
        <span style={styles.label}>Negative Marking:</span>
        <span style={styles.value}>{quiz.negativeMarking ? "Yes" : "No"}</span>
      </div>
      {quiz.negativeMarking && (
        <div style={styles.infoRow}>
          <span style={styles.label}>Negative Default:</span>
          <span style={styles.value}>{quiz.negativeDefault}</span>
        </div>
      )}
    </section>

    <section style={styles.section}>
      <h3 style={styles.sectionTitle}>Schedule</h3>
      <div style={styles.infoRow}>
        <span style={styles.label}>Scheduled:</span>
        <span style={styles.value}>{quiz.scheduled ? "Yes" : "No"}</span>
      </div>
      {quiz.scheduled && (
        <>
          <div style={styles.infoRow}>
            <span style={styles.label}>Date:</span>
            <span style={styles.value}>{quiz.scheduleDate || "N/A"}</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.label}>Time:</span>
            <span style={styles.value}>{quiz.scheduleTime || "N/A"}</span>
          </div>
        </>
      )}
    </section>

    <section style={styles.section}>
      <h3 style={styles.sectionTitle}>Statistics</h3>
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{analytics.totalAttempts || 0}</div>
          <div style={styles.statLabel}>Total Attempts</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{analytics.liveAttemptingUsers || 0}</div>
          <div style={styles.statLabel}>Live Users</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{Number(analytics.averageScore || 0).toFixed(2)}</div>
          <div style={styles.statLabel}>Average Score</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{analytics.highestScore || 0}</div>
          <div style={styles.statLabel}>Highest Score</div>
        </div>
      </div>
    </section>
  </div>
);

const QuestionsTab = ({ questions }) => (
  <div style={styles.questionsList}>
    {questions.length === 0 ? (
      <p style={styles.emptyState}>No questions found</p>
    ) : (
      questions.map((q, idx) => (
        <div key={q._id} style={styles.questionCard}>
          <div style={styles.questionHeader}>
            <span style={styles.questionNumber}>Q{idx + 1}</span>
            <span style={styles.questionMark}>{q.mark} marks</span>
          </div>
          <p style={styles.questionText}>{q.text}</p>
          <div style={styles.optionsList}>
            {q.options?.map((opt, i) => (
              <div
                key={opt._id}
                style={{
                  ...styles.option,
                  ...(opt.isCorrect ? styles.correctOption : {}),
                }}
              >
                {String.fromCharCode(65 + i)}. {opt.text}
              </div>
            ))}
          </div>
        </div>
      ))
    )}
  </div>
);

const ResponsesTab = ({ responses, onPublish }) => {
  const submittedResponses = responses.filter((r) => r.status === "submitted");
  const allPublished =
    submittedResponses.length > 0 && submittedResponses.every((r) => r.resultPublished);

  return (
  <div style={styles.responsesContainer}>
    <div style={styles.responsesHeader}>
      <h3 style={{ margin: 0, fontSize: "18px", color: "#333" }}>Responses</h3>
      <button
        style={allPublished ? styles.warningBtnSmall : styles.successBtnSmall}
        onClick={() => onPublish(!allPublished)}
        disabled={submittedResponses.length === 0}
        title={submittedResponses.length === 0 ? "No submitted attempts yet" : ""}
      >
        {allPublished ? "Hide Results" : "Publish Results"}
      </button>
    </div>
    {responses.length === 0 ? (
      <p style={styles.emptyState}>No responses yet</p>
    ) : (
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Participant</th>
            <th style={styles.th}>Status</th>
            <th style={styles.th}>Score</th>
            <th style={styles.th}>Percentage</th>
            <th style={styles.th}>Result</th>
            <th style={styles.th}>Time Spent</th>
            <th style={styles.th}>Submitted At</th>
          </tr>
        </thead>
        <tbody>
          {responses.map((r) => (
            <tr key={r._id} style={styles.tr}>
              <td style={styles.td}>{r.participant?.name || "Unknown"}</td>
              <td style={styles.td}>{r.status}</td>
              <td style={styles.td}>{r.score}</td>
              <td style={styles.td}>{Number(r.percentageScore || 0).toFixed(2)}%</td>
              <td style={styles.td}>
                {r.status === "submitted" ? (r.resultPublished ? "Published" : "Hidden") : "-"}
              </td>
              <td style={styles.td}>{r.timeSpentSec}s</td>
              <td style={styles.td}>
                {r.submittedAt ? new Date(r.submittedAt).toLocaleString() : "N/A"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    )}
  </div>
  );
};

const EditTab = ({ quiz, editData, setEditData, onSave, onStatusChange, onToast }) => {
  const handleScheduleToggle = (checked) => {
    if (!checked) {
      // If unchecking scheduled, clear schedule data
      setEditData({ 
        ...editData, 
        scheduled: false, 
        scheduleDate: null, 
        scheduleTime: null 
      });
    } else {
      setEditData({ ...editData, scheduled: true });
    }
  };

  const validateScheduleDateTime = () => {
    if (!editData.scheduled || !editData.scheduleDate || !editData.scheduleTime) {
      return true; // No validation needed if not scheduled
    }

    const scheduledDateTime = new Date(`${editData.scheduleDate}T${editData.scheduleTime}`);
    const now = new Date();

    if (scheduledDateTime <= now) {
      onToast?.("Schedule time must be in the future!");
      return false;
    }
    return true;
  };

  const handleSave = () => {
    if (!validateScheduleDateTime()) {
      return;
    }
    onSave();
  };

  // Get current date and time for min attribute
  const now = new Date();
  const currentDate = now.toISOString().split('T')[0];
  const currentTime = now.toTimeString().slice(0, 5);

  return (
    <div style={styles.editForm}>
      <h3 style={styles.sectionTitle}>Edit Quiz</h3>
      
      <div style={styles.formGroup}>
        <label style={styles.formLabel}>Title</label>
        <input
          type="text"
          style={styles.input}
          value={editData.title || ""}
          onChange={(e) => setEditData({ ...editData, title: e.target.value })}
        />
      </div>
      
      <div style={styles.formGroup}>
        <label style={styles.formLabel}>Description</label>
        <textarea
          style={styles.textarea}
          value={editData.description || ""}
          onChange={(e) => setEditData({ ...editData, description: e.target.value })}
        />
      </div>

      <div style={styles.divider}></div>
      
      <div style={styles.optionsGrid}>
        <div style={styles.optionCard}>
          <label style={styles.optionLabel}>
            <input
              type="checkbox"
              style={styles.checkbox}
              checked={editData.scheduled || false}
              onChange={(e) => handleScheduleToggle(e.target.checked)}
            />
            <span style={styles.optionText}>Schedule Quiz</span>
          </label>
        </div>

        <div style={styles.optionCard}>
          <label style={styles.optionLabel}>
            <input
              type="checkbox"
              style={styles.checkbox}
              checked={editData.timedQuiz || false}
              onChange={(e) => setEditData({ ...editData, timedQuiz: e.target.checked })}
            />
            <span style={styles.optionText}>Timed Quiz</span>
          </label>
        </div>

        <div style={styles.optionCard}>
          <label style={styles.optionLabel}>
            <input
              type="checkbox"
              style={styles.checkbox}
              checked={editData.negativeMarking || false}
              onChange={(e) =>
                setEditData({ ...editData, negativeMarking: e.target.checked })
              }
            />
            <span style={styles.optionText}>Negative Marking</span>
          </label>
        </div>
      </div>

      {editData.scheduled && (
        <div style={styles.scheduleSection}>
          <h4 style={styles.subsectionTitle}>Schedule Settings</h4>
          <div style={styles.scheduleGrid}>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Schedule Date</label>
              <input
                type="date"
                style={styles.input}
                value={editData.scheduleDate || ""}
                min={currentDate}
                onChange={(e) => setEditData({ ...editData, scheduleDate: e.target.value })}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Schedule Time</label>
              <input
                type="time"
                style={styles.input}
                value={editData.scheduleTime || ""}
                onChange={(e) => setEditData({ ...editData, scheduleTime: e.target.value })}
              />
            </div>
          </div>
        </div>
      )}

      {editData.timedQuiz && (
        <div style={styles.scheduleSection}>
          <h4 style={styles.subsectionTitle}>Timing Settings</h4>
          <div style={styles.formGroup}>
            <label style={styles.formLabel}>Duration (minutes)</label>
            <input
              type="number"
              style={styles.input}
              min="1"
              max="720"
              value={editData.wholeDurationMinutes || 30}
              onChange={(e) =>
                setEditData({ ...editData, wholeDurationMinutes: parseInt(e.target.value) })
              }
            />
          </div>
        </div>
      )}

      {editData.negativeMarking && (
        <div style={styles.scheduleSection}>
          <h4 style={styles.subsectionTitle}>Negative Marking Settings</h4>
          <div style={styles.formGroup}>
            <label style={styles.formLabel}>Negative Default (marks deducted per wrong answer)</label>
            <input
              type="number"
              style={styles.input}
              min="0"
              max="100"
              step="0.25"
              value={editData.negativeDefault || 0.25}
              onChange={(e) =>
                setEditData({ ...editData, negativeDefault: parseFloat(e.target.value) })
              }
            />
          </div>
        </div>
      )}

      <div style={styles.formActions}>
        <button style={styles.primaryBtn} onClick={handleSave}>
          Save Changes
        </button>
        {quiz.status === "live" && (
          <button style={styles.warningBtn} onClick={() => onStatusChange("closed")}>
            Close Quiz
          </button>
        )}
        {quiz.status === "closed" && (
          <button style={styles.successBtn} onClick={() => onStatusChange("live")}>
            Reopen Quiz
          </button>
        )}
        {quiz.status === "scheduled" && (
          <button style={styles.successBtn} onClick={() => onStatusChange("live")}>
            Go Live Now
          </button>
        )}
      </div>
    </div>
  );
};

const ConfirmDialog = ({ action, data, onConfirm, onCancel }) => (
  <div style={styles.overlay}>
    <div style={styles.dialog}>
      <FaExclamationTriangle style={styles.dialogIcon} />
      <h3 style={styles.dialogTitle}>Confirm Action</h3>
      <p style={styles.dialogText}>
        {action === "delete"
          ? "Are you sure you want to delete this quiz? This action cannot be undone."
          : action === "status"
            ? `Are you sure you want to change status to ${data}?`
            : `Are you sure you want to ${data ? "publish" : "hide"} results for submitted attempts?`}
      </p>
      <div style={styles.dialogActions}>
        <button style={styles.cancelBtn} onClick={onCancel}>
          Cancel
        </button>
        <button style={styles.confirmBtn} onClick={onConfirm}>
          Confirm
        </button>
      </div>
    </div>
  </div>
);

const styles = {
  container: { padding: "20px", maxWidth: "1200px", margin: "0 auto" },
  backBtn: { 
    display: "flex", 
    alignItems: "center", 
    gap: "6px", 
    padding: "8px 16px", 
    background: "#f5f5f5", 
    color: "#555", 
    border: "1px solid #ddd", 
    borderRadius: "6px", 
    cursor: "pointer", 
    fontWeight: "500", 
    fontSize: "13px", 
    marginBottom: "20px",
    transition: "all 0.3s ease",
    width: "fit-content"
  },
  backIcon: { fontSize: "12px" },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
    borderBottom: "2px solid #e0e0e0",
    paddingBottom: "15px",
  },
  title: { margin: 0, fontSize: "28px", color: "#333" },
  subtitle: { margin: "5px 0 0", color: "#666", fontSize: "14px" },
  headerActions: { display: "flex", gap: "10px", alignItems: "center" },
  statusBadge: {
    padding: "6px 12px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: "600",
    textTransform: "uppercase",
  },
  statuslive: { background: "#4caf50", color: "#fff" },
  statusclosed: { background: "#f44336", color: "#fff" },
  statusscheduled: { background: "#ff9800", color: "#fff" },
  tabs: {
    display: "flex",
    gap: "10px",
    marginBottom: "20px",
    borderBottom: "1px solid #e0e0e0",
  },
  tab: {
    padding: "10px 20px",
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: "16px",
    color: "#666",
    borderBottom: "3px solid transparent",
    transition: "all 0.3s",
  },
  activeTab: { color: "#1976d2", borderBottom: "3px solid #1976d2", fontWeight: "600" },
  content: { background: "#fff", padding: "20px", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" },
  overviewGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px" },
  section: { padding: "15px", background: "#f9f9f9", borderRadius: "8px" },
  sectionTitle: { margin: "0 0 15px", fontSize: "18px", color: "#333", borderBottom: "2px solid #1976d2", paddingBottom: "8px" },
  infoRow: { display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #e0e0e0" },
  label: { fontWeight: "600", color: "#555" },
  value: { color: "#333" },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "15px", marginTop: "10px" },
  statCard: { background: "#fff", padding: "15px", borderRadius: "8px", textAlign: "center", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" },
  statValue: { fontSize: "32px", fontWeight: "700", color: "#1976d2", margin: "0 0 5px" },
  statLabel: { fontSize: "14px", color: "#666" },
  questionsList: { display: "flex", flexDirection: "column", gap: "15px" },
  questionCard: { padding: "15px", background: "#f9f9f9", borderRadius: "8px", border: "1px solid #e0e0e0" },
  questionHeader: { display: "flex", justifyContent: "space-between", marginBottom: "10px" },
  questionNumber: { fontWeight: "700", color: "#1976d2", fontSize: "16px" },
  questionMark: { background: "#4caf50", color: "#fff", padding: "4px 8px", borderRadius: "4px", fontSize: "12px" },
  questionText: { margin: "10px 0", fontSize: "16px", color: "#333" },
  optionsList: { display: "flex", flexDirection: "column", gap: "8px" },
  option: { padding: "10px", background: "#fff", borderRadius: "4px", border: "1px solid #e0e0e0" },
  correctOption: { background: "#e8f5e9", border: "1px solid #4caf50", fontWeight: "600" },
  responsesContainer: { overflowX: "auto" },
  responsesHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "12px",
    gap: "12px",
  },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { padding: "12px", textAlign: "left", background: "#1976d2", color: "#fff", fontWeight: "600" },
  tr: { borderBottom: "1px solid #e0e0e0" },
  td: { padding: "12px", color: "#333" },
  editForm: { display: "flex", flexDirection: "column", gap: "20px" },
  formGroup: { display: "flex", flexDirection: "column", gap: "8px" },
  formLabel: { fontWeight: "600", color: "#555", fontSize: "14px" },
  input: { padding: "10px", border: "1px solid #ccc", borderRadius: "4px", fontSize: "14px" },
  textarea: { padding: "10px", border: "1px solid #ccc", borderRadius: "4px", fontSize: "14px", minHeight: "100px", resize: "vertical" },
  divider: { height: "1px", background: "#e0e0e0", margin: "10px 0" },
  optionsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "15px", marginBottom: "10px" },
  optionCard: { padding: "15px", background: "#f9f9f9", borderRadius: "8px", border: "1px solid #e0e0e0", transition: "all 0.2s" },
  optionLabel: { display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" },
  checkbox: { width: "18px", height: "18px", cursor: "pointer" },
  optionText: { fontSize: "15px", fontWeight: "500", color: "#333" },
  subsectionTitle: { margin: "0 0 15px", fontSize: "16px", color: "#333", fontWeight: "600" },
  scheduleSection: { background: "#f9f9f9", padding: "20px", borderRadius: "8px", border: "1px solid #e0e0e0" },
  scheduleGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "15px", marginBottom: "15px" },
  checkboxLabel: { display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", color: "#555" },
  infoBox: { display: "flex", alignItems: "center", gap: "8px", padding: "12px", background: "#e3f2fd", borderRadius: "6px", border: "1px solid #90caf9" },
  infoIcon: { fontSize: "18px" },
  infoText: { fontSize: "13px", color: "#1565c0", lineHeight: "1.5" },
  formActions: { display: "flex", gap: "15px", marginTop: "20px", flexWrap: "wrap" },
  primaryBtn: { padding: "14px 32px", background: "linear-gradient(135deg, #1976d2 0%, #1565c0 100%)", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "16px", boxShadow: "0 4px 12px rgba(25, 118, 210, 0.3)", transition: "all 0.3s ease", transform: "translateY(0)", minWidth: "160px" },
  dangerBtn: { padding: "14px 32px", background: "linear-gradient(135deg, #f44336 0%, #d32f2f 100%)", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "16px", boxShadow: "0 4px 12px rgba(244, 67, 54, 0.3)", transition: "all 0.3s ease", transform: "translateY(0)", minWidth: "160px" },
  warningBtn: { padding: "14px 32px", background: "linear-gradient(135deg, #ff9800 0%, #f57c00 100%)", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "16px", boxShadow: "0 4px 12px rgba(255, 152, 0, 0.3)", transition: "all 0.3s ease", transform: "translateY(0)", minWidth: "160px" },
  successBtn: { padding: "14px 32px", background: "linear-gradient(135deg, #4caf50 0%, #388e3c 100%)", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "16px", boxShadow: "0 4px 12px rgba(76, 175, 80, 0.3)", transition: "all 0.3s ease", transform: "translateY(0)", minWidth: "160px" },
  successBtnSmall: { padding: "8px 14px", background: "linear-gradient(135deg, #4caf50 0%, #388e3c 100%)", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "13px", boxShadow: "0 4px 12px rgba(76, 175, 80, 0.2)" },
  warningBtnSmall: { padding: "8px 14px", background: "linear-gradient(135deg, #ff9800 0%, #f57c00 100%)", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "13px", boxShadow: "0 4px 12px rgba(255, 152, 0, 0.2)" },
  cancelBtn: { padding: "10px 20px", background: "#ccc", color: "#333", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "600" },
  confirmBtn: { padding: "10px 20px", background: "#f44336", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "600" },
  emptyState: { textAlign: "center", color: "#999", padding: "40px", fontSize: "16px" },
  loadingContainer: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "400px", gap: "15px" },
  spinner: { fontSize: "48px", color: "#1976d2", animation: "spin 1s linear infinite" },
  errorContainer: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "400px", gap: "15px" },
  errorIcon: { fontSize: "48px", color: "#f44336" },
  overlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  dialog: { background: "#fff", padding: "30px", borderRadius: "8px", maxWidth: "400px", textAlign: "center" },
  dialogIcon: { fontSize: "48px", color: "#ff9800", marginBottom: "15px" },
  dialogTitle: { margin: "0 0 10px", fontSize: "20px", color: "#333" },
  dialogText: { margin: "0 0 20px", color: "#666", fontSize: "14px" },
  dialogActions: { display: "flex", gap: "10px", justifyContent: "center" },
};

export default ManageQuiz;
