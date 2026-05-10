import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";
import ToastPill from "../components/ToastPill";
import useToast from "../hooks/useToast";
import {
  FaClock, FaChevronRight, FaChevronLeft,
  FaForward, FaPaperPlane, FaInfoCircle,
} from "react-icons/fa";
import { getAttemptSession, saveAttemptAnswer, submitAttempt } from "../services/attemptService";

const isAnsweredValue = (v) => {
  if (v === undefined || v === null) return false;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "string") return v.trim().length > 0;
  return true;
};

const AttemptQuizForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const handleSubmitRef = useRef(async () => {});
  const currentIndexRef = useRef(0);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers,      setAnswers]      = useState({});
  const [skipped,      setSkipped]      = useState(new Set());
  const [timeLeft,     setTimeLeft]     = useState(0);
  const [perQuestionTimeLeft, setPerQuestionTimeLeft] = useState({});
  const [submitted,    setSubmitted]    = useState(false);
  const [hoveredOpt,   setHoveredOpt]   = useState(null);
  const [tooltipOpen,  setTooltipOpen]  = useState(false);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState("");
  const [submitting,   setSubmitting]   = useState(false);
  const [quizMeta,     setQuizMeta]     = useState(null);
  const [questions,    setQuestions]    = useState([]);
  const [totalTimeSec, setTotalTimeSec] = useState(0);
  const { toast, showToast } = useToast();

  const total = questions.length;
  currentIndexRef.current = currentIndex;

  useEffect(() => {
    const loadAttemptSession = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await getAttemptSession(id);
        const loadedQuestions = (data?.questions || []).map((question) => ({
          id: String(question._id),
          text: question.text,
          optionType: question.optionType,
          mark: Number(question.mark || 0),
          negative: question.negative,
          timeSeconds: question.timeSeconds,
          options: (question.options || []).map((opt) => ({
            id: String(opt._id),
            text: opt.text,
          })),
        }));
        const savedAnswers = data?.attempt?.answers || {};
        const meta = data?.quiz || null;
        const timed = !!meta?.timedQuiz;
        const wholeSeconds =
          timed && meta.wholeOrPerQuestion === "whole"
            ? Math.max(0, Number(meta.wholeDurationMinutes || 0) * 60)
            : 0;

        setQuizMeta(meta);
        setQuestions(loadedQuestions);
        setAnswers(savedAnswers);
        setSubmitted(data?.attempt?.status === "submitted");
        setPerQuestionTimeLeft({});
        setTotalTimeSec(wholeSeconds);
        setTimeLeft(wholeSeconds);
      } catch (err) {
        setError(err?.response?.data?.message || "Failed to load quiz attempt");
      } finally {
        setLoading(false);
      }
    };

    loadAttemptSession();
  }, [id]);

  const handleSubmit = useCallback(
    async (isAutoSubmit = false) => {
      if (submitted || submitting) return;
      try {
        setSubmitting(true);
        await submitAttempt(id);
        setSubmitted(true);
        const successMessage = isAutoSubmit
          ? "Time is up. Quiz submitted successfully."
          : "Quiz submitted successfully.";
        showToast(successMessage, "success", 1500);
        setTimeout(() => navigate("/dashboard/attempt"), 900);
      } catch (err) {
        setError(err?.response?.data?.message || "Failed to submit quiz");
      } finally {
        setSubmitting(false);
      }
    },
    [submitted, submitting, id, navigate]
  );

  useEffect(() => {
    handleSubmitRef.current = handleSubmit;
  }, [handleSubmit]);

  // Whole-quiz countdown (timed + "whole")
  useEffect(() => {
    if (
      submitted ||
      submitting ||
      loading ||
      !quizMeta?.timedQuiz ||
      quizMeta.wholeOrPerQuestion !== "whole" ||
      totalTimeSec <= 0
    ) {
      return;
    }
    const t = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(t);
          handleSubmitRef.current(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [submitted, submitting, loading, quizMeta?.timedQuiz, quizMeta?.wholeOrPerQuestion, totalTimeSec]);

  // Per-question timer: allocate countdown once per question when first visited
  useEffect(() => {
    if (
      !quizMeta?.timedQuiz ||
      quizMeta.wholeOrPerQuestion !== "per" ||
      loading ||
      submitted ||
      submitting
    ) {
      return;
    }
    const qq = questions[currentIndex];
    if (!qq?.id) return;
    setPerQuestionTimeLeft((prev) => {
      if (prev[qq.id] != null) return prev;
      const secs = Math.max(1, Number(qq.timeSeconds || quizMeta.pqtDefaultSeconds || 60));
      return { ...prev, [qq.id]: secs };
    });
  }, [
    currentIndex,
    questions,
    quizMeta?.timedQuiz,
    quizMeta?.wholeOrPerQuestion,
    quizMeta?.pqtDefaultSeconds,
    loading,
    submitted,
    submitting,
  ]);

  useEffect(() => {
    if (
      !quizMeta?.timedQuiz ||
      quizMeta.wholeOrPerQuestion !== "per" ||
      loading ||
      submitted ||
      submitting
    ) {
      return;
    }
    const qid = questions[currentIndex]?.id;
    if (!qid) return;
    const t = setInterval(() => {
      setPerQuestionTimeLeft((prev) => {
        const cur = prev[qid];
        if (cur == null) return prev;
        if (cur <= 1) {
          Promise.resolve().then(() => {
            const idx = currentIndexRef.current;
            if (idx < questions.length - 1) {
              setCurrentIndex(idx + 1);
            } else {
              handleSubmitRef.current(true);
            }
          });
          return { ...prev, [qid]: 0 };
        }
        return { ...prev, [qid]: cur - 1 };
      });
    }, 1000);
    return () => clearInterval(t);
  }, [
    quizMeta?.timedQuiz,
    quizMeta?.wholeOrPerQuestion,
    currentIndex,
    questions,
    loading,
    submitted,
    submitting,
  ]);

  // ── Navigation ─────────────────────────────────────────────
  const handleNext = () => {
    if (currentIndex < total - 1) setCurrentIndex((i) => i + 1);
  };
  const handleBack = () => {
    if (currentIndex > 0) setCurrentIndex((i) => i - 1);
  };
  const handleSkip = async () => {
    const qid = questions[currentIndex]?.id;
    setSkipped((prev) => new Set([...prev, qid]));
    if (qid) {
      try {
        await saveAttemptAnswer(id, { questionId: qid, answer: null });
      } catch (_) {
        // Keep UI responsive even if one save fails.
      }
    }
    if (currentIndex < total - 1) setCurrentIndex((i) => i + 1);
  };

  const setAnswer = async (qId, value) => {
    setSkipped((prev) => {
      const n = new Set(prev);
      n.delete(qId);
      return n;
    });
    setAnswers((prev) => ({ ...prev, [qId]: value }));
    try {
      await saveAttemptAnswer(id, { questionId: qId, answer: value });
    } catch (_) {
      // keep local state; submission still saves everything server-side from latest synced data
    }
  };

  const q = questions[currentIndex];

  const isWholeTimed =
    !!quizMeta?.timedQuiz &&
    quizMeta.wholeOrPerQuestion === "whole" &&
    totalTimeSec > 0;
  const isPerTimed = !!quizMeta?.timedQuiz && quizMeta.wholeOrPerQuestion === "per";
  const showBackButton = !isPerTimed;
  const showTimer = isWholeTimed || isPerTimed;
  const displaySeconds = isWholeTimed
    ? timeLeft
    : isPerTimed
      ? (perQuestionTimeLeft[q?.id] ?? 0)
      : 0;
  const mm = Math.floor(displaySeconds / 60);
  const ss = displaySeconds % 60;
  const isLowTime = showTimer && displaySeconds > 0 && displaySeconds <= 30;

  const negForQuestion =
    quizMeta?.negativeMarking ? Number(q?.negative ?? quizMeta.negativeDefault ?? 0) : null;

  const answered = Object.keys(answers).filter((k) => isAnsweredValue(answers[k])).length;
  if (loading) {
    return (
      <DashboardLayout>
        <ToastPill toast={toast} />
        <div style={{ padding: "24px" }}>Loading quiz...</div>
      </DashboardLayout>
    );
  }

  if (error && !q) {
    return (
      <DashboardLayout>
        <ToastPill toast={toast} />
        <div style={{ padding: "24px", color: "#dc2626" }}>{error}</div>
      </DashboardLayout>
    );
  }

  if (!q) return (
    <DashboardLayout>
      <ToastPill toast={toast} />
      <div style={{ padding: "24px" }}>No questions available for this attempt.</div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
      <ToastPill toast={toast} />
      <div style={S.shell}>

        {/* ════════════════════════════════════════════
            LEFT: MAIN PANEL
        ════════════════════════════════════════════ */}
        <div style={S.main}>

          {/* ── Top header bar ─────────────────────── */}
          <div style={S.topBar}>
            {/* Left: question label */}
            <div style={S.topLeft}>
              <FaChevronRight size={13} style={{ color: "#2563eb", flexShrink: 0 }} />
              <span style={S.topQLabel}>Question {currentIndex + 1}</span>
              {q.optionType === "checkbox" && <span style={S.multiPill}>Multi-select</span>}
              {q.optionType === "short-answer" && <span style={S.multiPill}>Short answer</span>}
              {skipped.has(q.id) && <span style={S.skippedPill}>Skipped</span>}
            </div>

            {/* Right: pill badges */}
            <div style={S.topRight}>
              {/* Marking scheme */}
              <div style={S.schemePill}>
                <span style={S.schemePos}>+{q.mark}</span>
                <span style={S.schemeSep}>/</span>
                {negForQuestion != null ? (
                  <span style={S.schemeNeg}>−{negForQuestion}</span>
                ) : (
                  <span style={S.schemeOff}>no negative</span>
                )}
              </div>

              {showTimer ? (
                <div style={{ ...S.timerPill, ...(isLowTime ? S.timerPillDanger : {}) }}>
                  <FaClock size={12} style={{ marginRight: "5px", flexShrink: 0, color: isLowTime ? "#dc2626" : "#2563eb" }} />
                  <span style={{ ...S.timerValue, color: isLowTime ? "#dc2626" : "#111827" }}>
                    {mm.toString().padStart(2, "0")}:{ss.toString().padStart(2, "0")}
                  </span>
                </div>
              ) : (
                <div style={S.timerPillOpen}>
                  <span style={S.timerOpenText}>No time limit</span>
                </div>
              )}

              {/* Progress */}
              <div style={S.progressPill}>
                <span style={S.progressLabel}>Answered</span>
                <span style={S.progressValue}>{answered} / {total}</span>
              </div>
            </div>
          </div>

          {quizMeta?.unavailableForNewAttempts && (
            <div style={S.quizClosedNotice}>
              This quiz is closed for new participants, but your in-progress attempt is still allowed.
            </div>
          )}

          {/* ── Slim timer bar ──────────────────────── */}
          {/* removed */}

          {/* ── Question card ───────────────────────── */}
          <div style={S.contentArea}>
            <div style={S.qCard}>

              {/* Question text */}
              <p style={S.qText}>{q.text}</p>

              {q.optionType === "short-answer" ? (
                <div style={S.shortAnswerWrap}>
                  <textarea
                    style={S.shortAnswerInput}
                    placeholder="Type your answer..."
                    rows={4}
                    value={answers[q.id] ?? ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      setSkipped((prev) => {
                        const n = new Set(prev);
                        n.delete(q.id);
                        return n;
                      });
                      setAnswers((prev) => ({ ...prev, [q.id]: v }));
                    }}
                    onBlur={async (e) => {
                      try {
                        await saveAttemptAnswer(id, {
                          questionId: q.id,
                          answer: e.target.value.trim(),
                        });
                      } catch (_) {}
                    }}
                  />
                </div>
              ) : (
                <div style={S.optionList}>
                  {q.options.map((opt, i) => {
                    const letter = String.fromCharCode(65 + i);
                    const selected = Array.isArray(answers[q.id])
                      ? answers[q.id].includes(opt.text)
                      : answers[q.id] === opt.text;
                    const hovered = hoveredOpt === `${q.id}-${i}` && !selected;
                    const multi = q.optionType === "checkbox";

                    return (
                      <label
                        key={opt.id || i}
                        style={{
                          ...S.optCard,
                          ...(selected ? S.optCardSelected : {}),
                          ...(hovered ? S.optCardHover : {}),
                        }}
                        onMouseEnter={() => setHoveredOpt(`${q.id}-${i}`)}
                        onMouseLeave={() => setHoveredOpt(null)}
                        onClick={async () => {
                          if (q.optionType === "checkbox") {
                            const arr = answers[q.id] || [];
                            const next = arr.includes(opt.text)
                              ? arr.filter((x) => x !== opt.text)
                              : [...arr, opt.text];
                            await setAnswer(q.id, next);
                          } else {
                            await setAnswer(q.id, opt.text);
                          }
                        }}
                      >
                        <span
                          style={{
                            ...S.optBadge,
                            borderRadius: multi ? "6px" : "50%",
                            ...(selected ? S.optBadgeSelected : {}),
                          }}
                        >
                          {selected ? "✓" : letter}
                        </span>
                        <span style={S.optText}>{opt.text}</span>
                        <input
                          type={multi ? "checkbox" : "radio"}
                          name={`q-${q.id}`}
                          checked={selected}
                          onChange={() => {}}
                          style={{ display: "none" }}
                        />
                      </label>
                    );
                  })}
                </div>
              )}

              {/* ── Card action bar ─────────────────── */}
              <div style={S.cardDivider} />
              <div style={S.cardActions}>
                {/* Back (ghost) */}
                {showBackButton ? (
                  <button
                    style={{ ...S.ghostBtn, ...(currentIndex === 0 ? S.btnDisabled : {}) }}
                    onClick={handleBack}
                    disabled={currentIndex === 0}
                  >
                    <FaChevronLeft size={11} style={{ marginRight: "5px" }} />
                    Back
                  </button>
                ) : (
                  <div />
                )}

                <div style={S.rightBtns}>
                  {/* Skip (ghost, neutral) */}
                  {currentIndex < total - 1 && (
                    <button style={S.skipBtn} onClick={handleSkip}>
                      <FaForward size={11} style={{ marginRight: "5px" }} />
                      Skip
                    </button>
                  )}

                  {/* Save & Next / Submit */}
                  {currentIndex < total - 1 ? (
                    <button style={S.primaryBtn} onClick={handleNext}>
                      Save &amp; Next
                      <FaChevronRight size={11} style={{ marginLeft: "5px" }} />
                    </button>
                  ) : (
                    <button
                      style={{ ...S.submitBtn, ...(submitted ? S.btnDisabled : {}) }}
                      onClick={() => handleSubmit(false)}
                      disabled={submitted || submitting}
                    >
                      <FaPaperPlane size={11} style={{ marginRight: "7px" }} />
                      {submitting ? "Submitting..." : "Submit Quiz"}
                    </button>
                  )}
                </div>
              </div>

            </div>{/* /qCard */}
            {error && (
              <div style={{ paddingTop: "10px", color: "#dc2626", fontWeight: 500 }}>
                {error}
              </div>
            )}
          </div>{/* /contentArea */}

        </div>{/* /main */}

        {/* ════════════════════════════════════════════
            RIGHT SIDEBAR — Question Palette
        ════════════════════════════════════════════ */}
        <aside style={S.sidebar}>

          {/* Header */}
          <div style={S.sideHeader}>
            <span style={S.sideHeaderLabel}>Question Palette</span>
          </div>

          <div style={S.sideBody}>
            {/* Total count */}
            <p style={S.totalLabel}>Total Questions: <strong>{total}</strong></p>

            {/* Palette grid */}
            <div style={S.paletteGrid}>
              {questions.map((qq, i) => {
                const isDone    = isAnsweredValue(answers[qq.id]);
                const isSkip    = skipped.has(qq.id);
                const isCurrent = i === currentIndex;
                let btnStyle = { ...S.palBtn };
                if (isCurrent)            btnStyle = { ...btnStyle, ...S.palBtnCurrent };
                else if (isDone)          btnStyle = { ...btnStyle, ...S.palBtnDone };
                else if (isSkip)          btnStyle = { ...btnStyle, ...S.palBtnSkipped };
                return (
                  <button
                    key={qq.id}
                    style={btnStyle}
                    onClick={() => setCurrentIndex(i)}
                    title={`Go to Question ${i + 1}`}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>

            {/* Divider */}
            <div style={S.divider} />

            {/* Legend */}
            <p style={S.legendHeading}>Legend</p>
            <div style={S.legendList}>
              {[
                { solidBg: "#DBEAFE", solidColor: "#2563eb", label: "Current"     },
                { solidBg: "#DCFCE7", solidColor: "#16a34a", label: "Answered"    },
                { solidBg: "#FFEDD5", solidColor: "#ea580c", label: "Skipped"     },
                { solidBg: "#F3F4F6", solidColor: "#9ca3af", label: "Not Visited" },
              ].map(({ solidBg, solidColor, label }) => (
                <div key={label} style={S.legendRow}>
                  <span style={{ ...S.legendDot, background: solidBg, border: `1.5px solid ${solidColor}22` }} />
                  <span style={S.legendText}>{label}</span>
                </div>
              ))}
            </div>

            {/* Disclaimer tooltip trigger */}
            <div style={S.disclaimerRow}>
              <button
                style={S.infoBtn}
                onMouseEnter={() => setTooltipOpen(true)}
                onMouseLeave={() => setTooltipOpen(false)}
                title="Important notice"
              >
                <FaInfoCircle size={13} style={{ color: "#9ca3af" }} />
                <span style={S.infoText}>Important notice</span>
              </button>
              {tooltipOpen && (
                <div style={{ ...S.tooltip, left: "auto", right: 0 }}>
                  Do <strong>not close</strong> or <strong>refresh</strong> this page.
                  You may not be able to reattempt with this quiz ID.
                </div>
              )}
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
    gap: "16px",
    flex: 1,
  },
  totalLabel: {
    margin: 0,
    fontSize: "13px",
    color: C.textMid,
    fontWeight: 500,
  },

  // Palette grid
  paletteGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(5, 1fr)",
    gap: "7px",
  },
  palBtn: {
    aspectRatio: "1",
    borderRadius: "7px",
    border: `1.5px solid ${C.border}`,
    background: "#F9FAFB",
    color: C.textMuted,
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.14s ease",
    boxShadow: "none",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  palBtnCurrent: {
    background: C.blue,
    borderColor: "#1d4ed8",
    color: "#fff",
    boxShadow: `0 0 0 3px ${C.blueBg}`,
  },
  palBtnDone: {
    background: "#f0fdf4",
    borderColor: "#86efac",
    color: "#16a34a",
  },
  palBtnSkipped: {
    background: "#fff7ed",
    borderColor: "#fdba74",
    color: "#ea580c",
  },

  // Divider
  divider: {
    height: "1px",
    background: C.border,
    margin: "0 -2px",
  },

  // Legend
  legendHeading: {
    margin: 0,
    fontSize: "11px",
    fontWeight: "700",
    letterSpacing: "0.5px",
    textTransform: "uppercase",
    color: C.textLight,
  },
  legendList: {
    display: "flex",
    flexDirection: "column",
    gap: "9px",
    marginTop: "-4px",
  },
  legendRow: {
    display: "flex",
    alignItems: "center",
    gap: "9px",
  },
  legendDot: {
    width: "16px",
    height: "16px",
    borderRadius: "4px",
    flexShrink: 0,
    display: "block",
  },
  legendText: {
    fontSize: "12px",
    color: "#666666",
    fontWeight: 500,
  },

  // Disclaimer tooltip
  disclaimerRow: {
    marginTop: "auto",
    position: "relative",
  },
  infoBtn: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "4px 0",
    boxShadow: "none",
  },
  infoText: {
    fontSize: "11px",
    color: C.textLight,
    fontWeight: 500,
  },
  tooltip: {
    position: "absolute",
    bottom: "calc(100% + 8px)",
    left: 0,
    width: "210px",
    background: "#1f2937",
    color: "#f9fafb",
    fontSize: "11px",
    lineHeight: "1.6",
    padding: "10px 12px",
    borderRadius: "8px",
    boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
    zIndex: 100,
    pointerEvents: "none",
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
  quizClosedNotice: {
    margin: "10px 28px 0",
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px solid #fbbf24",
    background: "#fffbeb",
    color: "#92400e",
    fontSize: "12px",
    fontWeight: "600",
  },
  topLeft: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  topQLabel: {
    fontSize: "15px",
    fontWeight: "700",
    color: C.textDark,
  },
  multiPill: {
    padding: "2px 8px",
    borderRadius: "999px",
    background: "#ede9fe",
    color: "#7c3aed",
    fontSize: "10px",
    fontWeight: "600",
    letterSpacing: "0.2px",
  },
  skippedPill: {
    padding: "2px 8px",
    borderRadius: "999px",
    background: "#fff7ed",
    color: "#ea580c",
    fontSize: "10px",
    fontWeight: "600",
  },
  topRight: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexWrap: "wrap",
  },

  // Marking scheme pill
  schemePill: {
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
  schemePos: { color: C.greenText },
  schemeSep: { color: C.textLight, fontWeight: 400, fontSize: "12px" },
  schemeNeg: { color: C.redText },
  schemeOff: { color: C.textMuted, fontWeight: 600, fontSize: "11px" },

  // Timer pill
  timerPill: {
    display: "flex",
    alignItems: "center",
    padding: "6px 14px",
    borderRadius: "999px",
    background: C.blueBg,
    border: `1px solid ${C.blueBorder}`,
    fontSize: "14px",
    fontWeight: "700",
    letterSpacing: "0.5px",
  },
  timerPillDanger: {
    background: "#fff5f5",
    borderColor: "#fecaca",
  },
  timerPillOpen: {
    display: "flex",
    alignItems: "center",
    padding: "6px 14px",
    borderRadius: "999px",
    background: "#F3F4F6",
    border: `1px solid ${C.border}`,
    fontSize: "12px",
    fontWeight: "600",
    color: C.textMuted,
  },
  timerOpenText: {
    fontVariantNumeric: "tabular-nums",
  },
  timerValue: {
    fontVariantNumeric: "tabular-nums",
    fontWeight: 700,
    fontSize: "14px",
  },

  // Progress pill
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

  // Timer track
  timerTrack: {
    height: "3px",
    background: "#E5E7EB",
  },
  timerFill: {
    height: "100%",
    transition: "width 1s linear, background 0.5s ease",
    borderRadius: "0 2px 2px 0",
  },

  // Content area
  contentArea: {
    flex: 1,
    padding: "28px 32px",
    background: C.bg,
  },

  // Question card — fixed height so all cards look the same size
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

  // Question text
  qText: {
    margin: 0,
    padding: "28px 28px 20px",
    fontSize: "18px",
    fontWeight: "700",
    color: C.textDark,
    lineHeight: "1.55",
  },

  // Option list — grows to fill available space
  shortAnswerWrap: {
    padding: "0 28px 20px",
    flex: 1,
  },
  shortAnswerInput: {
    width: "100%",
    minHeight: "120px",
    padding: "14px 16px",
    borderRadius: "10px",
    border: `1px solid ${C.border}`,
    fontSize: "15px",
    fontFamily: "inherit",
    color: C.textMid,
    resize: "vertical",
    boxSizing: "border-box",
  },
  optionList: {
    display: "flex",
    flexDirection: "column",
    gap: "0",
    padding: "0 20px",
    flex: 1,
  },
  optCard: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    padding: "11px 14px",
    marginTop: "6px",
    borderRadius: "0",
    border: "none",
    borderBottom: `1px solid ${C.border}`,
    background: "transparent",
    cursor: "pointer",
    transition: "background 0.12s ease",
    userSelect: "none",
  },
  optCardHover: {
    background: "#F3F4F6",
  },
  optCardSelected: {
    border: "none",
    borderBottom: `1px solid ${C.border}`,
    background: C.blueBg,
  },

  // Option badge (A/B/C/D — circle for radio, square for checkbox)
  optBadge: {
    width: "32px",
    height: "32px",
    flexShrink: 0,
    border: `1.5px solid ${C.borderMd}`,
    background: "#F3F4F6",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "700",
    fontSize: "12px",
    color: C.textMuted,
    transition: "all 0.13s ease",
  },
  optBadgeSelected: {
    background: C.blue,
    borderColor: C.blue,
    color: "#fff",
  },
  optText: {
    fontSize: "15px",
    color: C.textMid,
    fontWeight: "500",
    lineHeight: "1.4",
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
  rightBtns: {
    display: "flex",
    gap: "10px",
    alignItems: "center",
  },

  // Ghost / Back button — strictly content-width, no stretching
  ghostBtn: {
    display: "inline-flex",
    alignItems: "center",
    padding: "8px 14px",
    borderRadius: "8px",
    border: `1px solid #94A3B8`,
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

  // Skip button — slate outlined, clearly visible
  skipBtn: {
    display: "flex",
    alignItems: "center",
    padding: "8px 16px",
    borderRadius: "8px",
    border: `1px solid #94A3B8`,
    background: C.white,
    color: "#334155",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.13s ease",
    boxShadow: "none",
    whiteSpace: "nowrap",
  },

  // Primary — Save & Next, solid blue
  primaryBtn: {
    display: "flex",
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
  },

  // Submit — green
  submitBtn: {
    display: "flex",
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
  },

  btnDisabled: {
    opacity: 0.4,
    cursor: "not-allowed",
  },
};

export default AttemptQuizForm;
