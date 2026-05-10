import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";
import {
  FaChevronLeft, FaChevronRight, FaCheck,
  FaPlus, FaTimes, FaLayerGroup,
  FaTrash, FaCopy,
} from "react-icons/fa";
import { getCreatorVaults } from "../services/vaultService";
import ToastPill from "../components/ToastPill";
import useToast from "../hooks/useToast";

const STEPS = [
  "Timed quiz",
  "Shuffle & negative",
  "Quiz title",
  "Questions",
  "Schedule",
  "Confirm",
];

const CreateQuiz = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [timedQuiz, setTimedQuiz] = useState(false);
  const [wholeOrPerQuestion, setWholeOrPerQuestion] = useState("whole");
  const [pqtDefaultSeconds, setPqtDefaultSeconds] = useState(60);
  const [wholeDurationMinutes, setWholeDurationMinutes] = useState(30);
  const [shuffle, setShuffle] = useState(false);
  const [negativeMarking, setNegativeMarking] = useState(false);
  const [negativeDefault, setNegativeDefault] = useState(0.25);
  const [title, setTitle] = useState("");
  const [questions, setQuestions] = useState([]);
  const [scheduled, setScheduled] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [quizPass, setQuizPass] = useState("");
  const [quizId] = useState("QZ-" + Math.random().toString(36).slice(2, 10).toUpperCase());
  const [addIntoVault, setAddIntoVault] = useState(false);
  const [selectedVaultId, setSelectedVaultId] = useState("");
  const [creatorVaults, setCreatorVaults] = useState([]);

  const { toast, showToast } = useToast();

  const totalMarks = questions.reduce((s, q) => s + (q.mark ?? 1), 0);

  useEffect(() => {
    const run = async () => {
      try {
        const data = await getCreatorVaults();
        setCreatorVaults(data?.vaults || []);
      } catch {
        setCreatorVaults([]);
      }
    };
    run();
  }, []);

  // ── Validation — checks all mandatory fields at once ─────
  const validate = () => {
    if (title.trim() === "") {
      showToast("Quiz title is required.");
      setStep(2);
      return false;
    }
    if (questions.length === 0) {
      showToast("Add at least one question.");
      setStep(3);
      return false;
    }
    if (quizPass.trim() === "") {
      showToast("Quiz Pass is required.");
      setStep(5);
      return false;
    }
    if (addIntoVault && !selectedVaultId) {
      showToast("Please select a vault, or choose 'No' for add into vault.");
      setStep(5);
      return false;
    }
    return true;
  };
  // ─────────────────────────────────────────────────────────

  const handleNext = async () => {
    if (step < STEPS.length - 1) return setStep((s) => s + 1);
    if (!validate()) return;

    try {
      const token = localStorage.getItem("token");
      const payload = {
        quizId,
        title: title.trim(),
        timedQuiz,
        wholeOrPerQuestion,
        wholeDurationMinutes,
        pqtDefaultSeconds,
        shuffle,
        negativeMarking,
        negativeDefault,
        scheduled,
        scheduleDate: scheduled ? scheduleDate : null,
        scheduleTime: scheduled ? scheduleTime : null,
        quizPass: quizPass.trim(),
        vaultId: addIntoVault && selectedVaultId ? selectedVaultId : null,
        questions: questions.map((q, idx) => ({
          order: idx + 1,
          text: q.text?.trim(),
          optionType: q.optionType === "short" ? "short-answer" : q.optionType,
          options: Array.isArray(q.options) ? q.options.map((o) => o.trim()).filter(Boolean) : [],
          rightAnswer: q.rightAnswer ?? null,
          mark: Number(q.mark) || 1,
          negative: negativeMarking ? (q.negative ?? negativeDefault) : null,
          timeSeconds: timedQuiz && wholeOrPerQuestion === "per" ? (q.timeSeconds ?? pqtDefaultSeconds) : null,
        })),
      };

      const API_BASE = (process.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
      const url = `http://localhost:5000/api/quizzes`;

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify(payload),
      });

      // console.log("Response status:", res.status);

      const contentType = res.headers.get("content-type") || "";
      const raw = await res.text();
      let data = null;
      // console.log("Raw response:", raw);
      try {
        data = raw ? JSON.parse(raw) : null;
      } catch {
        data = {
          message:
            res.status === 404
              ? `API route not found: ${url}. Fix: (1) backend running, (2) quizzes route mounted at /api/quizzes, (3) VITE_API_BASE_URL points to backend (e.g. http://localhost:5000).`
              : `Non-JSON response (${res.status}). URL: ${url}. Content-Type: ${contentType || "unknown"}`,
        };
      }

      if (!res.ok) throw new Error(data?.message || `Failed to create quiz (${res.status})`);

      showToast(`Quiz created! ID: ${data?.quiz?.quizId || quizId}`, "success");
      setTimeout(() => navigate("/dashboard/create"), 1200);
    } catch (e) {
      showToast(e.message || "Create failed");
    }
  };

  const handleBack = () => {
    if (step > 0) setStep((s) => s - 1);
    else navigate("/dashboard/create");
  };

  const addQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      {
        id: Date.now(),
        type: "text",
        text: "",
        options: ["", "", "", ""],
        optionType: "radio",
        rightAnswer: null,
        mark: 1,
        timeSeconds: wholeOrPerQuestion === "per" ? pqtDefaultSeconds : undefined,
        negative: negativeMarking ? negativeDefault : undefined,
      },
    ]);
  };

  const updateQuestion = (id, updates) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, ...updates } : q))
    );
  };

  const removeQuestion = (id) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  const addOption = (questionId) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === questionId ? { ...q, options: [...(q.options || []), ""] } : q
      )
    );
  };

  const removeOption = (questionId, optionIndex) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== questionId) return q;
        const opts = [...(q.options || [])];
        opts.splice(optionIndex, 1);
        return { ...q, options: opts, rightAnswer: "" };
      })
    );
  };

  const updateOption = (questionId, optionIndex, value) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== questionId) return q;
        const opts = [...(q.options || [])];
        opts[optionIndex] = value;
        return { ...q, options: opts };
      })
    );
  };

  const duplicateQuestion = (id) => {
    setQuestions((prev) => {
      const idx = prev.findIndex((q) => q.id === id);
      if (idx === -1) return prev;
      const copy = { ...prev[idx], id: Date.now() };
      const next = [...prev];
      next.splice(idx + 1, 0, copy);
      return next;
    });
  };

  const needsOptionsList = (optionType) =>
    optionType === "radio" || optionType === "checkbox" || optionType === "selection";

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div style={S.stepContent}>
            {/* Setting row: timed quiz */}
            <div style={S.settingRow}>
              <div style={S.settingInfo}>
                <h3 style={S.stepTitle}>Is this a timed quiz?</h3>
                <p style={S.stepDesc}>After a fixed time the quiz will close automatically.</p>
              </div>
              <div style={S.segmented}>
                <button
                  style={{ ...S.segBtn, ...(timedQuiz === true ? S.segBtnActive : {}) }}
                  onClick={() => setTimedQuiz(true)}
                >
                  Yes
                </button>
                <button
                  style={{ ...S.segBtn, ...(timedQuiz === false ? S.segBtnActive : {}) }}
                  onClick={() => setTimedQuiz(false)}
                >
                  No
                </button>
              </div>
            </div>
            {timedQuiz === true && (
              <>
                <div style={S.settingDivider} />
                {/* Setting row: whole vs per-question */}
                <div style={S.settingRow}>
                  <div style={S.settingInfo}>
                    <h4 style={S.subTitle}>Timer scope</h4>
                    <p style={S.stepDesc}>Apply one countdown to the whole quiz, or give each question its own timer.</p>
                  </div>
                  <div style={S.segmented}>
                    <button
                      style={{ ...S.segBtn, ...(wholeOrPerQuestion === "whole" ? S.segBtnActive : {}) }}
                      onClick={() => setWholeOrPerQuestion("whole")}
                    >
                      Whole quiz
                    </button>
                    <button
                      style={{ ...S.segBtn, ...(wholeOrPerQuestion === "per" ? S.segBtnActive : {}) }}
                      onClick={() => setWholeOrPerQuestion("per")}
                    >
                      Per question
                    </button>
                  </div>
                </div>
                {wholeOrPerQuestion === "whole" && (
                  <>
                    <div style={S.settingDivider} />
                    <div style={S.fieldGroup}>
                      <label style={S.fieldLabel}>Quiz Duration</label>
                      <div style={S.durationRow}>
                        <input
                          type="number"
                          min={1}
                          placeholder="e.g. 30"
                          value={wholeDurationMinutes}
                          onChange={(e) => setWholeDurationMinutes(Number(e.target.value))}
                          style={{ ...S.input, maxWidth: "120px" }}
                        />
                        <span style={S.durationUnit}>minutes</span>
                      </div>
                      <p style={S.fieldHint}>Enter the total time allowed for the entire quiz.</p>
                    </div>
                  </>
                )}
                {wholeOrPerQuestion === "per" && (
                  <>
                    <div style={S.settingDivider} />
                    <div style={S.fieldGroup}>
                      <label style={S.fieldLabel}>Default time per question (seconds)</label>
                      <input
                        type="number"
                        min={10}
                        value={pqtDefaultSeconds}
                        onChange={(e) => setPqtDefaultSeconds(Number(e.target.value))}
                        style={{ ...S.input, maxWidth: "160px" }}
                      />
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        );
      case 1:
        return (
          <div style={S.stepContent}>
            {/* Setting row: shuffle */}
            <div style={S.settingRow}>
              <div style={S.settingInfo}>
                <h3 style={S.stepTitle}>Shuffle questions?</h3>
                <p style={S.stepDesc}>Questions will be presented in random order to each participant.</p>
              </div>
              <div style={S.segmented}>
                <button
                  style={{ ...S.segBtn, ...(shuffle === true ? S.segBtnActive : {}) }}
                  onClick={() => setShuffle(true)}
                >
                  Yes
                </button>
                <button
                  style={{ ...S.segBtn, ...(shuffle === false ? S.segBtnActive : {}) }}
                  onClick={() => setShuffle(false)}
                >
                  No
                </button>
              </div>
            </div>

            <div style={S.settingDivider} />

            {/* Setting row: negative marking */}
            <div style={S.settingRow}>
              <div style={S.settingInfo}>
                <h3 style={S.stepTitle}>Negative marking?</h3>
                <p style={S.stepDesc}>Deduct marks for wrong answers.</p>
              </div>
              <div style={S.segmented}>
                <button
                  style={{ ...S.segBtn, ...(negativeMarking === true ? S.segBtnActive : {}) }}
                  onClick={() => setNegativeMarking(true)}
                >
                  Yes
                </button>
                <button
                  style={{ ...S.segBtn, ...(negativeMarking === false ? S.segBtnActive : {}) }}
                  onClick={() => setNegativeMarking(false)}
                >
                  No
                </button>
              </div>
            </div>
            {negativeMarking === true && (
              <>
                <div style={S.settingDivider} />
                <div style={S.fieldGroup}>
                  <label style={S.fieldLabel}>Default negative mark (e.g. 0.25)</label>
                  <input
                    type="number"
                    step={0.25}
                    min={0}
                    value={negativeDefault}
                    onChange={(e) => setNegativeDefault(Number(e.target.value))}
                    style={{ ...S.input, maxWidth: "160px" }}
                  />
                </div>
              </>
            )}
          </div>
        );
      case 2:
        return (
          <div style={S.stepContent}>
            <h3 style={S.stepTitle}>Quiz title</h3>
            <p style={S.stepDesc}>Give your quiz a clear, descriptive name.</p>
            <input
              type="text"
              placeholder="Enter quiz title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={S.input}
            />
          </div>
        );
      case 3:
        return (
          <div style={S.stepContent}>
            {/* ── Card internal header ─────────────────── */}
            <div style={S.qStepHeader}>
              <div style={S.qStepHeaderLeft}>
                <h3 style={S.qStepTitle}>Add questions</h3>
                <p style={S.qStepDesc}>Supported types: Multiple choice, checkbox, dropdown, and short answer.</p>
              </div>
              <button style={S.addBtn} onClick={addQuestion}>
                <FaPlus size={11} style={{ marginRight: "6px" }} />
                Add question
              </button>
            </div>
            <div style={S.qStepDivider} />

            {/* ── Empty state ──────────────────────────── */}
            {questions.length === 0 && (
              <div style={S.emptyState}>
                <div style={S.emptyIconWrap}>
                  <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
                    <rect x="9" y="3" width="6" height="4" rx="1" />
                    <line x1="12" y1="11" x2="12" y2="17" />
                    <line x1="9" y1="14" x2="15" y2="14" />
                  </svg>
                </div>
                <p style={S.emptyHeading}>No questions added yet.</p>
                <p style={S.emptyText}>Click the button above to start building your quiz.</p>
              </div>
            )}

            {/* ── Question blocks ──────────────────────── */}
            {questions.map((q, i) => (
              <div key={q.id} style={S.questionBlock}>

                {/* ── Card header: Q# label + controls ── */}
                <div style={S.qBlockHeader}>
                  <span style={S.qBlockNum}>Q{i + 1}</span>
                  <div style={S.qBlockControls}>
                    <select
                      value={q.optionType}
                      onChange={(e) => updateQuestion(q.id, {
                        optionType: e.target.value,
                        options: e.target.value === "short" ? [] : q.options || [],
                        rightAnswer: "",
                      })}
                      style={S.qTypeSelect}
                    >
                      <option value="radio">Multiple choice</option>
                      <option value="checkbox">Checkboxes</option>
                      <option value="selection">Dropdown</option>
                      <option value="short">Short answer</option>
                    </select>
                    <input
                      type="number"
                      min={1}
                      value={q.mark}
                      onChange={(e) => updateQuestion(q.id, { mark: Number(e.target.value) || 1 })}
                      style={S.qCompactInput}
                      placeholder="Marks"
                      title="Marks"
                    />
                    {wholeOrPerQuestion === "per" && timedQuiz && (
                      <input
                        type="number"
                        value={q.timeSeconds ?? ""}
                        onChange={(e) => updateQuestion(q.id, { timeSeconds: Number(e.target.value) || undefined })}
                        style={S.qCompactInput}
                        placeholder="Time"
                        title="Time (seconds)"
                      />
                    )}
                    {negativeMarking && (
                      <input
                        type="number"
                        step={0.25}
                        value={q.negative ?? ""}
                        onChange={(e) => updateQuestion(q.id, { negative: Number(e.target.value) || undefined })}
                        style={{ ...S.qCompactInput, width: "72px" }}
                        placeholder="-ve"
                        title="Negative marks"
                      />
                    )}
                  </div>
                </div>

                {/* ── Question text ──────────────────────── */}
                <textarea
                  className="q-text-input"
                  placeholder="Type your question here..."
                  value={q.text}
                  rows={2}
                  onChange={(e) => updateQuestion(q.id, { text: e.target.value })}
                  onInput={(e) => {
                    e.target.style.height = "auto";
                    e.target.style.height = Math.min(e.target.scrollHeight, 150) + "px";
                  }}
                  style={S.qTextInput}
                />

                {/* ── Options with correct answer marking ── */}
                {needsOptionsList(q.optionType) && (
                  <div style={S.optionsSection}>
                    {(q.options || []).map((opt, optIdx) => {
                      const isCorrect = q.optionType === "checkbox"
                        ? (Array.isArray(q.rightAnswer) ? q.rightAnswer.includes(opt) : false)
                        : (q.rightAnswer !== null && q.rightAnswer !== "" && q.rightAnswer === opt);
                      return (
                        <div key={optIdx} style={{
                          ...S.optionRow,
                          ...(isCorrect ? S.optionRowCorrect : {}),
                        }}>
                          {/* ○ Correct-answer circle */}
                          <button
                            type="button"
                            onClick={() => {
                              if (q.optionType === "checkbox") {
                                const current = Array.isArray(q.rightAnswer) ? q.rightAnswer : [];
                                const next = current.includes(opt)
                                  ? current.filter((v) => v !== opt)
                                  : [...current, opt];
                                updateQuestion(q.id, { rightAnswer: next });
                              } else {
                                updateQuestion(q.id, { rightAnswer: isCorrect ? null : opt });
                              }
                            }}
                            style={{
                              ...S.correctIndicatorBtn,
                              ...(isCorrect ? S.correctIndicatorBtnActive : {}),
                              borderRadius: q.optionType === "checkbox" ? "4px" : "50%",
                            }}
                            title="Mark as correct"
                          >
                            {isCorrect && <FaCheck size={8} />}
                          </button>
                          {/* Option text input */}
                          <input
                            type="text"
                            className="option-input-field"
                            placeholder={`Option ${optIdx + 1}`}
                            value={opt}
                            onChange={(e) => updateOption(q.id, optIdx, e.target.value)}
                            style={{
                              ...S.optionInput,
                              ...(isCorrect ? S.optionInputCorrect : {}),
                            }}
                          />
                          {/* ✕ Remove option */}
                          <button
                            type="button"
                            className="remove-option-btn"
                            style={S.removeOptionBtn}
                            onClick={() => removeOption(q.id, optIdx)}
                            title="Remove option"
                          >
                            <FaTimes size={12} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* ── Short answer hint ─────────────────── */}
                {q.optionType === "short" && (
                  <div style={S.shortAnswerWrap}>
                    <input
                      placeholder="Correct answer (exact match)"
                      value={q.rightAnswer}
                      onChange={(e) => updateQuestion(q.id, { rightAnswer: e.target.value })}
                      style={{ ...S.input, background: "#f9fafb", fontSize: "13px" }}
                    />
                  </div>
                )}

                {/* ── Card footer ────────────────────────── */}
                <div style={S.qCardFooter}>

                  {/* LEFT — Add option */}
                  <div style={S.qFooterLeft}>
                    {needsOptionsList(q.optionType) && (
                      <button
                        type="button"
                        className="add-option-btn"
                        style={S.qAddOptionBtn}
                        onClick={() => addOption(q.id)}
                      >
                        <FaPlus size={9} />
                        <span>Add option</span>
                      </button>
                    )}
                  </div>

                  {/* RIGHT — Duplicate + Delete */}
                  <div style={S.qFooterRight}>
                    <button
                      style={S.qDuplicateBtn}
                      className="q-footer-btn"
                      onClick={() => duplicateQuestion(q.id)}
                      title="Duplicate question"
                    >
                      <FaCopy size={12} />
                      <span>Duplicate</span>
                    </button>
                    <button
                      style={S.qDeleteBtn}
                      className="q-footer-btn q-footer-btn-danger"
                      onClick={() => removeQuestion(q.id)}
                      title="Delete question"
                    >
                      <FaTrash size={12} />
                    </button>
                  </div>

                </div>

              </div>
            ))}
          </div>
        );
      case 4:
        return (
          <div style={S.stepContent}>
            <div style={S.settingRow}>
              <div style={S.settingInfo}>
                <h3 style={S.stepTitle}>Schedule the quiz?</h3>
                <p style={S.stepDesc}>Set a date and time for the quiz to go live automatically.</p>
              </div>
              <div style={S.segmented}>
                <button
                  style={{ ...S.segBtn, ...(scheduled === true ? S.segBtnActive : {}) }}
                  onClick={() => setScheduled(true)}
                >
                  Yes
                </button>
                <button
                  style={{ ...S.segBtn, ...(scheduled === false ? S.segBtnActive : {}) }}
                  onClick={() => setScheduled(false)}
                >
                  No
                </button>
              </div>
            </div>
            {scheduled === false && (
              <>
                <div style={S.settingDivider} />
                <div style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "10px",
                  padding: "12px 16px",
                  background: "#f0fdf4",
                  border: "1px solid #86efac",
                  borderRadius: "8px",
                }}>
                  <FaCheck size={13} style={{ color: "#16a34a", marginTop: "2px", flexShrink: 0 }} />
                  <p style={{ margin: 0, fontSize: "13px", color: "#15803d", fontWeight: "500", lineHeight: "1.5" }}>
                    It will go live exactly after you confirm the quiz!
                  </p>
                </div>
              </>
            )}
            {scheduled === true && (
              <>
                <div style={S.settingDivider} />
                <div style={S.dateRow}>
                  <div style={S.fieldGroup}>
                    <label style={S.fieldLabel}>Date</label>
                    <input
                      type="date"
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      style={S.input}
                    />
                  </div>
                  <div style={S.fieldGroup}>
                    <label style={S.fieldLabel}>Time</label>
                    <input
                      type="time"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                      style={S.input}
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        );
      case 5:
        return (
          <div style={S.stepContent}>
            <h3 style={S.stepTitle}>Confirm &amp; set Quiz Pass</h3>
            <p style={S.stepDesc}>
              After confirmation, no changes are allowed except schedule or &quot;Live now&quot;.
            </p>
            <div style={S.confirmIdBox}>
              <span style={S.confirmIdLabel}>Quiz ID</span>
              <span style={S.confirmIdValue}>{quizId}</span>
            </div>
            <div style={S.fieldGroup}>
              <label style={S.fieldLabel}>Quiz Pass</label>
              <input
                type="text"
                placeholder="Set a pass phrase for participants"
                value={quizPass}
                onChange={(e) => setQuizPass(e.target.value)}
                style={S.input}
              />
            </div>
            <div style={S.confirmSummary}>
              <div style={S.confirmSummaryRow}>
                <span>Questions</span><strong>{questions.length}</strong>
              </div>
              <div style={S.confirmSummaryRow}>
                <span>Total marks</span><strong>{totalMarks}</strong>
              </div>
              {timedQuiz && wholeOrPerQuestion === "whole" && wholeDurationMinutes > 0 && (
                <div style={S.confirmSummaryRow}>
                  <span>Quiz duration</span><strong>{wholeDurationMinutes} min</strong>
                </div>
              )}
              {timedQuiz && wholeOrPerQuestion === "per" && (
                <div style={S.confirmSummaryRow}>
                  <span>PQT default</span><strong>{pqtDefaultSeconds}s</strong>
                </div>
              )}
              {shuffle != null && (
                <div style={S.confirmSummaryRow}>
                  <span>Shuffle</span><strong>{shuffle ? "Yes" : "No"}</strong>
                </div>
              )}
              {negativeMarking != null && (
                <div style={S.confirmSummaryRow}>
                  <span>Negative marking</span><strong>{negativeMarking ? `−${negativeDefault}` : "No"}</strong>
                </div>
              )}
              <div style={S.confirmSummaryRow}>
                <span>Schedule</span>
                <strong>{scheduled ? `${scheduleDate} ${scheduleTime}` : "Live on confirm"}</strong>
              </div>
            </div>
            <div style={{ ...S.fieldGroup, marginTop: "14px" }}>
              <label style={{ ...S.fieldLabel, textTransform: "none", letterSpacing: 0 }}>Add into Vault?</label>
              <div style={S.segmented}>
                <button
                  type="button"
                  style={{ ...S.segBtn, ...(addIntoVault === true ? S.segBtnActive : {}) }}
                  onClick={() => setAddIntoVault(true)}
                >
                  Yes
                </button>
                <button
                  type="button"
                  style={{ ...S.segBtn, ...(addIntoVault === false ? S.segBtnActive : {}) }}
                  onClick={() => {
                    setAddIntoVault(false);
                    setSelectedVaultId("");
                  }}
                >
                  No
                </button>
              </div>
              {addIntoVault && (
                <select
                  value={selectedVaultId}
                  onChange={(e) => setSelectedVaultId(e.target.value)}
                  style={{ ...S.select, marginTop: "10px" }}
                >
                  <option value="">Select a vault</option>
                  {creatorVaults.map((v) => (
                    <option key={v._id} value={v._id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <DashboardLayout>
      <div style={S.shell}>

        <ToastPill toast={toast} />

        {/* ════════════════════════════════════════════
            MAIN PANEL
        ════════════════════════════════════════════ */}
        <div style={S.main}>

          {/* ── Top bar ─────────────────────────────── */}
          <div style={S.topBar}>
            <div style={S.topLeft}>
              <FaLayerGroup size={14} style={{ color: C.blue, flexShrink: 0 }} />
              <span style={S.topPageLabel}>Create New Quiz</span>
              <span style={S.stepNamePill}>{STEPS[step]}</span>
            </div>
            <div style={S.topRight}>
              <div style={S.progressPill}>
                <span style={S.progressLabel}>Step</span>
                <span style={S.progressValue}>{step + 1} / {STEPS.length}</span>
              </div>
              {questions.length > 0 && (
                <div style={S.statsPill}>
                  <span style={S.statsGreen}>{questions.length}Q</span>
                  <span style={S.statsSep}>/</span>
                  <span style={S.statsBlue}>{totalMarks}pts</span>
                </div>
              )}
            </div>
          </div>

          {/* ── Content area ────────────────────────── */}
          <div style={S.contentArea}>

            {/* Step indicator */}
            <div style={S.stepStrip}>
              {STEPS.map((s, i) => {
                const done    = i < step;
                const current = i === step;
                return (
                  <div key={s} style={S.stepItem}>
                    <div
                      title={`Go to: ${s}`}
                      onClick={() => {
                        if (i === STEPS.length - 1 && !validate()) return;
                        setStep(i);
                      }}
                      style={{
                        ...S.stepDot,
                        ...(current ? S.stepDotActive : {}),
                        ...(done    ? S.stepDotDone  : {}),
                      }}
                    >
                      {done ? <FaCheck size={9} /> : i + 1}
                    </div>
                    <span
                      style={{
                        ...S.stepLabel,
                        ...(current ? S.stepLabelActive : {}),
                        ...(done    ? S.stepLabelDone   : {}),
                        cursor: "pointer",
                      }}
                      onClick={() => {
                        if (i === STEPS.length - 1 && !validate()) return;
                        setStep(i);
                      }}
                    >{s}</span>
                    {i < STEPS.length - 1 && (
                      <div style={{
                        ...S.stepLine,
                        ...(done ? S.stepLineDone : {}),
                      }} />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Step card */}
            <div style={{ padding: "28px 32px" }}>
            <div style={S.qCard}>
              {renderStep()}

              {/* ── Card action bar ────────────────── */}
              <div style={S.cardDivider} />
              <div style={S.cardActions}>
                <button
                  style={S.ghostBtn}
                  onClick={handleBack}
                >
                  <FaChevronLeft size={11} style={{ marginRight: "5px" }} />
                  {step === 0 ? "Cancel" : "Back"}
                </button>
                <button
                  style={step === STEPS.length - 1 ? S.confirmBtn : S.primaryBtn}
                  onClick={handleNext}
                >
                  {step === STEPS.length - 1 ? (
                    <>
                      <FaCheck size={11} style={{ marginRight: "6px" }} />
                      Confirm &amp; Create
                    </>
                  ) : (
                    <>
                      Next
                      <FaChevronRight size={11} style={{ marginLeft: "5px" }} />
                    </>
                  )}
                </button>
              </div>
            </div>{/* /qCard */}
            </div>{/* /qCard padding wrapper */}

          </div>{/* /contentArea */}
        </div>{/* /main */}

        {/* ════════════════════════════════════════════
            RIGHT SIDEBAR — Summary
        ════════════════════════════════════════════ */}
        <aside style={S.sidebar}>
          <div style={S.sideHeader}>
            <span style={S.sideHeaderLabel}>Quiz Summary</span>
          </div>
          <div style={S.sideBody}>

            <div style={S.summaryRow}>
              <span style={S.summaryKey}>Questions</span>
              <span style={S.summaryVal}>{questions.length}</span>
            </div>
            <div style={S.summaryRow}>
              <span style={S.summaryKey}>Total marks</span>
              <span style={S.summaryVal}>{totalMarks}</span>
            </div>
            {timedQuiz != null && (
              <div style={S.summaryRow}>
                <span style={S.summaryKey}>Timed</span>
                <span style={{ ...S.summaryVal, color: timedQuiz ? C.greenText : C.textMuted }}>
                  {timedQuiz ? "Yes" : "No"}
                </span>
              </div>
            )}
            {timedQuiz && wholeOrPerQuestion && (
              <div style={S.summaryRow}>
                <span style={S.summaryKey}>Timer type</span>
                <span style={S.summaryVal}>{wholeOrPerQuestion === "per" ? "Per Q" : "Whole"}</span>
              </div>
            )}
            {timedQuiz && wholeOrPerQuestion === "whole" && wholeDurationMinutes > 0 && (
              <div style={S.summaryRow}>
                <span style={S.summaryKey}>Duration</span>
                <span style={{ ...S.summaryVal, color: C.blue }}>{wholeDurationMinutes} min</span>
              </div>
            )}
            {timedQuiz && wholeOrPerQuestion === "per" && (
              <div style={S.summaryRow}>
                <span style={S.summaryKey}>Default PQT</span>
                <span style={{ ...S.summaryVal, color: C.blue }}>{pqtDefaultSeconds}s</span>
              </div>
            )}
            {shuffle != null && (
              <div style={S.summaryRow}>
                <span style={S.summaryKey}>Shuffle</span>
                <span style={{ ...S.summaryVal, color: shuffle ? C.greenText : C.textMuted }}>
                  {shuffle ? "Yes" : "No"}
                </span>
              </div>
            )}
            {negativeMarking != null && (
              <div style={S.summaryRow}>
                <span style={S.summaryKey}>Negative</span>
                <span style={{ ...S.summaryVal, color: negativeMarking ? "#dc2626" : C.textMuted }}>
                  {negativeMarking ? `−${negativeDefault}` : "No"}
                </span>
              </div>
            )}
            {title && (
              <div style={S.summaryRow}>
                <span style={S.summaryKey}>Title</span>
                <span style={{ ...S.summaryVal, maxWidth: "110px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</span>
              </div>
            )}
            {scheduled != null && (
              <div style={S.summaryRow}>
                <span style={S.summaryKey}>Scheduled</span>
                <span style={{ ...S.summaryVal, color: scheduled ? C.blue : C.textMuted }}>
                  {scheduled ? (scheduleDate || "—") : "No"}
                </span>
              </div>
            )}

            <div style={S.sideDivider} />

            <div style={S.quizIdBlock}>
              <span style={S.quizIdLabel}>Quiz ID</span>
              <span style={S.quizIdValue}>{quizId}</span>
            </div>
          </div>
        </aside>

      </div>{/* /shell */}
    </DashboardLayout>
  );
};

// ═══════════════════════════════════════════════════════════
// DESIGN TOKENS
// ═══════════════════════════════════════════════════════════
const C = {
  bg:         "#F8F9FA",
  white:      "#FFFFFF",
  border:     "#E5E7EB",
  borderMd:   "#D1D5DB",
  blue:       "#2563eb",
  blueBg:     "#EFF6FF",
  blueBorder: "#BFDBFE",
  greenText:  "#16a34a",
  redText:    "#dc2626",
  textDark:   "#111827",
  textMid:    "#374151",
  textMuted:  "#6B7280",
  textLight:  "#9CA3AF",
  shadow:     "0 4px 6px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.04)",
  shadowSm:   "0 1px 3px rgba(0,0,0,0.06)",
};

// ═══════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════
const S = {

  // Shell
  shell: {
    display: "flex",
    alignItems: "stretch",
    minHeight: "calc(100vh - 64px)",
    background: C.bg,
    margin: "-24px",
    minWidth: "calc(100% + 48px)",
  },

  // ── SIDEBAR ──────────────────────────────────────────────
  sidebar: {
    width: "248px",
    flexShrink: 0,
    background: C.white,
    borderLeft: `1px solid ${C.border}`,
    display: "flex",
    flexDirection: "column",
    position: "sticky",
    top: "64px",
    maxHeight: "calc(100vh - 64px)",
    overflowY: "auto",
  },
  sideHeader: {
    padding: "16px 20px 12px",
    borderBottom: `1px solid ${C.border}`,
  },
  sideHeaderLabel: {
    fontSize: "11px",
    fontWeight: "700",
    letterSpacing: "0.7px",
    textTransform: "uppercase",
    color: C.textMuted,
  },
  sideBody: {
    padding: "16px 18px 20px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    flex: 1,
  },
  summaryRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryKey: {
    fontSize: "12px",
    color: C.textMuted,
    fontWeight: 500,
  },
  summaryVal: {
    fontSize: "13px",
    fontWeight: "700",
    color: C.textDark,
  },
  sideDivider: {
    height: "1px",
    background: C.border,
    margin: "6px -2px",
  },
  quizIdBlock: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    padding: "10px 12px",
    background: C.blueBg,
    border: `1px solid ${C.blueBorder}`,
    borderRadius: "8px",
  },
  quizIdLabel: {
    fontSize: "10px",
    fontWeight: "700",
    letterSpacing: "0.5px",
    textTransform: "uppercase",
    color: C.blue,
  },
  quizIdValue: {
    fontSize: "14px",
    fontWeight: "700",
    color: "#1d4ed8",
    fontFamily: "monospace",
    letterSpacing: "0.5px",
  },

  // ── MAIN ─────────────────────────────────────────────────
  main: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
  },

  // Top bar
  topBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "13px 28px",
    background: C.white,
    borderBottom: `1px solid ${C.border}`,
    flexWrap: "wrap",
    gap: "10px",
  },
  topLeft: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  topPageLabel: {
    fontSize: "15px",
    fontWeight: "700",
    color: C.textDark,
  },
  stepNamePill: {
    padding: "2px 10px",
    borderRadius: "999px",
    background: C.blueBg,
    color: C.blue,
    fontSize: "11px",
    fontWeight: "600",
    letterSpacing: "0.2px",
    border: `1px solid ${C.blueBorder}`,
  },
  topRight: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexWrap: "wrap",
  },
  progressPill: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "5px 12px",
    borderRadius: "999px",
    background: C.blueBg,
    border: `1px solid ${C.blueBorder}`,
  },
  progressLabel: {
    fontSize: "11px",
    fontWeight: "600",
    color: C.blue,
    textTransform: "uppercase",
    letterSpacing: "0.4px",
  },
  progressValue: {
    fontSize: "13px",
    fontWeight: "700",
    color: "#1d4ed8",
  },
  statsPill: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    padding: "5px 12px",
    borderRadius: "999px",
    background: "#F8F9FA",
    border: `1px solid ${C.border}`,
    fontSize: "13px",
    fontWeight: "700",
  },
  statsGreen:  { color: C.greenText },
  statsSep:    { color: C.textLight, fontWeight: 400, fontSize: "12px" },
  statsBlue:   { color: C.blue },

  // Content area
  contentArea: {
    flex: 1,
    padding: "0",
    background: C.bg,
  },

  // Step progress strip
  stepStrip: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "0",
    padding: "18px 32px",
    flexWrap: "wrap",
    gap: "4px",
    background: C.white,
    borderBottom: `1px solid ${C.border}`,
  },
  stepItem: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  stepDot: {
    width: "26px",
    height: "26px",
    borderRadius: "50%",
    background: "#F3F4F6",
    border: `1.5px solid ${C.border}`,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "11px",
    fontWeight: "700",
    color: C.textLight,
    flexShrink: 0,
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  stepDotActive: {
    background: C.blue,
    borderColor: "#1d4ed8",
    color: "#fff",
    boxShadow: `0 0 0 3px ${C.blueBg}`,
  },
  stepDotDone: {
    background: "#f0fdf4",
    borderColor: "#86efac",
    color: "#16a34a",
  },
  stepLabel: {
    fontSize: "11px",
    fontWeight: "500",
    color: C.textLight,
    whiteSpace: "nowrap",
  },
  stepLabelActive: {
    color: C.blue,
    fontWeight: "700",
  },
  stepLabelDone: {
    color: C.greenText,
    fontWeight: "600",
  },
  stepLine: {
    width: "20px",
    height: "2px",
    background: C.border,
    borderRadius: "1px",
    marginLeft: "4px",
  },
  stepLineDone: {
    background: "#86efac",
  },

  // Main card
  qCard: {
    background: C.white,
    borderRadius: "12px",
    border: `1px solid ${C.border}`,
    boxShadow: C.shadow,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    minHeight: "480px",
  },

  // Step content (inside the card)
  stepContent: {
    padding: "20px 28px 8px",
    flex: 1,
    display: "flex",
    flexDirection: "column",
  },
  stepTitle: {
    margin: "0 0 4px 0",
    fontSize: "16px",
    fontWeight: "700",
    color: C.textDark,
  },
  stepDesc: {
    margin: "0",
    fontSize: "13px",
    color: C.textMuted,
    lineHeight: "1.55",
  },
  subTitle: {
    margin: "20px 0 10px 0",
    fontSize: "14px",
    fontWeight: "600",
    color: C.textDark,
  },
  // Setting row — label+desc left, segmented control right
  settingRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "24px",
    padding: "20px 0",
  },
  settingInfo: {
    flex: 1,
    minWidth: 0,
  },
  settingDivider: {
    height: "1px",
    background: "#F3F4F6",
    margin: "0 0",
  },

  // Segmented control (Yes / No pill group)
  segmented: {
    display: "inline-flex",
    flexShrink: 0,
    borderRadius: "8px",
    border: `1.5px solid ${C.border}`,
    overflow: "hidden",
    background: "#F9FAFB",
  },
  segBtn: {
    padding: "7px 20px",
    border: "none",
    borderRight: `1.5px solid ${C.border}`,
    background: "transparent",
    color: C.textMuted,
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "13px",
    transition: "all 0.13s ease",
    whiteSpace: "nowrap",
    lineHeight: "1",
  },
  segBtnActive: {
    background: C.blue,
    color: "#fff",
    borderRightColor: "transparent",
  },

  // Legacy — kept for backward compatibility (unused in new steps)
  choices: {
    display: "flex",
    gap: "10px",
    marginBottom: "16px",
    flexWrap: "wrap",
  },
  choiceBtn: {
    padding: "9px 24px",
    borderRadius: "8px",
    border: `1.5px solid ${C.border}`,
    background: "#F9FAFB",
    color: C.textMid,
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "14px",
    transition: "all 0.13s ease",
  },
  choiceActive: {
    background: C.blue,
    color: "#fff",
    borderColor: "#1d4ed8",
    boxShadow: "0 2px 6px rgba(37,99,235,0.25)",
  },

  // Form fields
  fieldGroup: {
    marginBottom: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  fieldLabel: {
    fontSize: "12px",
    fontWeight: "700",
    color: C.textMid,
    textTransform: "uppercase",
    letterSpacing: "0.4px",
  },
  durationRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginTop: "2px",
  },
  durationUnit: {
    fontSize: "13px",
    fontWeight: "600",
    color: C.textMuted,
  },
  fieldHint: {
    margin: "6px 0 0 0",
    fontSize: "12px",
    color: C.textLight,
    lineHeight: "1.5",
  },
  input: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: "8px",
    border: `1px solid ${C.border}`,
    fontSize: "14px",
    color: C.textDark,
    background: C.white,
    boxSizing: "border-box",
    outline: "none",
    transition: "border-color 0.13s",
  },
  inputSmall: {
    width: "76px",
    padding: "8px 10px",
    borderRadius: "8px",
    border: `1px solid ${C.border}`,
    fontSize: "14px",
    color: C.textDark,
    background: C.white,
    textAlign: "center",
  },
  select: {
    padding: "9px 12px",
    borderRadius: "8px",
    border: `1px solid ${C.border}`,
    fontSize: "14px",
    color: C.textMid,
    background: C.white,
    cursor: "pointer",
  },
  dateRow: {
    display: "flex",
    gap: "16px",
    flexWrap: "wrap",
  },

  // Step header (Questions step)
  // Questions step — internal card header
  qStepHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
    padding: "0 0 18px 0",
  },
  qStepHeaderLeft: {
    flex: 1,
    minWidth: 0,
  },
  qStepTitle: {
    margin: "0 0 4px 0",
    fontSize: "17px",
    fontWeight: "700",
    color: C.textDark,
  },
  qStepDesc: {
    margin: 0,
    fontSize: "13px",
    color: C.textMuted,
    lineHeight: "1.5",
  },
  qStepDivider: {
    height: "1px",
    background: "#F3F4F6",
    margin: "0 0 20px 0",
  },

  // Step header (kept for other uses)
  stepHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "16px",
  },

  // Add question button
  addBtn: {
    display: "inline-flex",
    alignItems: "center",
    padding: "8px 16px",
    borderRadius: "8px",
    border: "none",
    background: "#1D4ED8",
    color: "#fff",
    fontWeight: "700",
    fontSize: "13px",
    cursor: "pointer",
    boxShadow: "0 2px 6px rgba(29,78,216,0.3)",
    whiteSpace: "nowrap",
    flexShrink: 0,
    width: "auto",
  },

  // Empty state — dashed bordered box
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "56px 24px",
    gap: "10px",
    border: "2px dashed #E5E7EB",
    borderRadius: "10px",
    background: "#FAFAFA",
    flex: 1,
  },
  emptyIconWrap: {
    width: "64px",
    height: "64px",
    borderRadius: "14px",
    background: "#F3F4F6",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "4px",
  },
  emptyHeading: {
    margin: 0,
    fontSize: "14px",
    fontWeight: "600",
    color: C.textMid,
  },
  emptyText: {
    margin: 0,
    fontSize: "13px",
    color: C.textLight,
    textAlign: "center",
  },

  // Question block
  questionBlock: {
    marginBottom: "16px",
    background: C.white,
    borderRadius: "12px",
    border: `1px solid ${C.border}`,
    boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
    overflow: "hidden",
  },
  qBlockHeader: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "12px 16px",
    borderBottom: `1px solid ${C.border}`,
    background: "#FAFBFC",
  },
  qBlockNum: {
    width: "32px",
    height: "32px",
    borderRadius: "8px",
    background: C.blueBg,
    border: `1px solid ${C.blueBorder}`,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "12px",
    fontWeight: "700",
    color: C.blue,
    flexShrink: 0,
  },
  qBlockControls: {
    marginLeft: "auto",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexWrap: "nowrap",
  },
  qTypeSelect: {
    height: "34px",
    padding: "0 12px",
    borderRadius: "6px",
    border: `1px solid ${C.border}`,
    fontSize: "13px",
    fontWeight: "500",
    color: C.textMid,
    background: C.white,
    cursor: "pointer",
    outline: "none",
  },
  qCompactInput: {
    width: "60px",
    height: "34px",
    padding: "0 10px",
    borderRadius: "6px",
    border: `1px solid ${C.border}`,
    fontSize: "13px",
    fontWeight: "600",
    color: C.textDark,
    background: C.white,
    textAlign: "center",
    outline: "none",
  },

  // Question text input — large & prominent
  qTextInput: {
    width: "100%",
    padding: "18px 20px",
    border: "none",
    borderBottom: `2px solid ${C.border}`,
    fontSize: "16px",
    fontWeight: "500",
    color: C.textDark,
    background: C.white,
    boxSizing: "border-box",
    outline: "none",
    fontFamily: "inherit",
    lineHeight: "1.5",
    resize: "none",
    overflow: "hidden",
    minHeight: "56px",   // ~2 lines
    maxHeight: "150px",
    overflowY: "auto",
    display: "block",
  },

  // Options
  optionsSection: {
    padding: "16px 20px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  optionRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "5px 6px",
    borderRadius: "7px",
    border: "1px solid transparent",
    background: "transparent",
    transition: "background 0.12s, border-color 0.12s",
  },
  optionRowCorrect: {
    background: "#f0fdf4",
    border: "1px solid #86efac",
  },
  correctIndicatorBtn: {
    width: "18px",
    height: "18px",
    borderRadius: "50%",
    border: "2px solid #D1D5DB",
    background: "#fff",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    flexShrink: 0,
    transition: "all 0.12s ease",
    padding: 0,
    color: "transparent",
  },
  correctIndicatorBtnActive: {
    background: "#16a34a",
    borderColor: "#16a34a",
    color: "#fff",
  },
  optionInput: {
    flex: 1,
    padding: "7px 10px",
    border: "1px solid #E5E7EB",
    borderRadius: "6px",
    fontSize: "13.5px",
    color: C.textDark,
    background: "#fff",
    outline: "none",
    fontFamily: "inherit",
    transition: "border-color 0.12s",
  },
  optionInputCorrect: {
    background: "#f0fdf4",
    borderColor: "#86efac",
    color: "#15803d",
    fontWeight: "500",
  },
  removeOptionBtn: {
    width: "22px",
    height: "22px",
    border: "none",
    background: "transparent",
    color: "#D1D5DB",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    flexShrink: 0,
    padding: 0,
    borderRadius: "4px",
    transition: "color 0.12s",
  },
  addOptionBtn: {
    display: "inline-flex",
    alignItems: "center",
    marginTop: "6px",
    marginLeft: "28px",      // aligns under text inputs (18px circle + 10px gap)
    padding: "5px 8px",
    border: "none",
    borderRadius: "6px",
    background: "transparent",
    color: C.blue,
    fontWeight: "600",
    fontSize: "13px",
    cursor: "pointer",
    alignSelf: "flex-start",
    transition: "background 0.12s",
  },

  // Short answer wrap
  shortAnswerWrap: {
    padding: "10px 14px 14px",
  },

  // Card footer — right-aligned ghost text buttons
  qCardFooter: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "8px 14px",
    borderTop: "1px solid #F3F4F6",
    background: "#FAFAFA",
  },
  qFooterLeft: {
    display: "flex",
    alignItems: "center",
  },
  qFooterRight: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
  },
  // + Add option — ghost text-link style
  qAddOptionBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "5px 10px",
    border: "none",
    borderRadius: "6px",
    background: "transparent",
    color: C.blue,
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "background 0.12s",
  },
  // Duplicate — icon + text, neutral ghost
  qDuplicateBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    padding: "5px 10px",
    border: "1px solid #E5E7EB",
    borderRadius: "6px",
    background: "transparent",
    color: "#6B7280",
    fontSize: "12px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "background 0.12s, color 0.12s, border-color 0.12s",
    whiteSpace: "nowrap",
  },
  // Delete — icon-only, red
  qDeleteBtn: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "30px",
    height: "30px",
    padding: 0,
    border: "1px solid #FECACA",
    borderRadius: "6px",
    background: "transparent",
    color: "#DC2626",
    cursor: "pointer",
    transition: "background 0.12s, border-color 0.12s",
    flexShrink: 0,
  },
  // keep for any remaining references
  qFooterBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    padding: "5px 10px",
    border: "none",
    borderRadius: "6px",
    background: "transparent",
    color: "#6B7280",
    fontSize: "12px",
    fontWeight: "500",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  qFooterBtnDanger: {
    color: "#dc2626",
  },

  // Confirm step
  confirmIdBox: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    padding: "12px 16px",
    background: C.blueBg,
    border: `1px solid ${C.blueBorder}`,
    borderRadius: "8px",
    marginBottom: "20px",
  },
  confirmIdLabel: {
    fontSize: "10px",
    fontWeight: "700",
    letterSpacing: "0.5px",
    textTransform: "uppercase",
    color: C.blue,
  },
  confirmIdValue: {
    fontSize: "18px",
    fontWeight: "800",
    color: "#1d4ed8",
    fontFamily: "monospace",
    letterSpacing: "1px",
  },
  confirmSummary: {
    marginTop: "16px",
    padding: "14px 16px",
    background: "#F9FAFB",
    border: `1px solid ${C.border}`,
    borderRadius: "8px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  confirmSummaryRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "13px",
    color: C.textMid,
  },

  // Card action bar
  cardDivider: {
    height: "1px",
    background: C.border,
    marginTop: "auto",
  },
  cardActions: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "14px 20px",
  },

  // Ghost / Back button
  ghostBtn: {
    display: "inline-flex",
    alignItems: "center",
    padding: "8px 14px",
    borderRadius: "8px",
    border: "1px solid #94A3B8",
    background: C.white,
    color: "#1E293B",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.13s ease",
    boxShadow: "none",
    whiteSpace: "nowrap",
    flexShrink: 0,
    width: "auto",
  },

  // Primary — Next
  primaryBtn: {
    display: "inline-flex",
    alignItems: "center",
    padding: "8px 20px",
    borderRadius: "8px",
    border: "none",
    background: "#1D4ED8",
    color: "#fff",
    fontSize: "13px",
    fontWeight: "700",
    cursor: "pointer",
    transition: "all 0.13s ease",
    boxShadow: "0 2px 6px rgba(29,78,216,0.35)",
    whiteSpace: "nowrap",
    flexShrink: 0,
    width: "auto",
  },

  // Confirm — green
  confirmBtn: {
    display: "inline-flex",
    alignItems: "center",
    padding: "8px 20px",
    borderRadius: "8px",
    border: "none",
    background: "linear-gradient(135deg,#059669,#047857)",
    color: "#fff",
    fontSize: "13px",
    fontWeight: "700",
    cursor: "pointer",
    transition: "all 0.13s ease",
    boxShadow: "0 2px 6px rgba(5,150,105,0.35)",
    whiteSpace: "nowrap",
    flexShrink: 0,
    width: "auto",
  },
};

// Inject keyframe for toast animation
const styleTag = document.createElement("style");
styleTag.textContent = `
  @keyframes fadeSlideDown {
    from { opacity: 0; transform: translateX(-50%) translateY(-10px); }
    to   { opacity: 1; transform: translateX(-50%) translateY(0);     }
  }
  .q-text-input:focus {
    border-bottom-color: #2563eb !important;
    overflow-y: auto;
  }
  .q-text-input::placeholder {
    font-weight: 400;
    color: #9CA3AF;
  }
  .option-input-field:focus {
    border-color: #2563eb !important;
    box-shadow: 0 0 0 3px rgba(37,99,235,0.1) !important;
  }
  .remove-option-btn:hover {
    color: #dc2626 !important;
  }
  .q-footer-btn:hover {
    background: #F3F4F6 !important;
    color: #111827 !important;
  }
  .q-footer-btn-danger:hover {
    background: #FEF2F2 !important;
    color: #991B1B !important;
  }
  .add-option-btn:hover {
    background: #EFF6FF !important;
  }
`;
if (!document.head.querySelector("#quizera-toast-style")) {
  styleTag.id = "quizera-toast-style";
  document.head.appendChild(styleTag);
}

export default CreateQuiz;
