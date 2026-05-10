const express = require("express");
const mongoose = require("mongoose");
const Quiz = require("../models/Quiz");
const Question = require("../models/Question");
const Option = require("../models/Option");
const Attempt = require("../models/Attempt");
const Vault = require("../models/Vault");
// ...use your existing auth middleware path...
const auth = require("../middlewares/authMiddleware");

const router = express.Router();

const toInt = (v, d) => Number.isFinite(Number(v)) ? Number(v) : d;
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

const shuffleIdsFisherYates = (ids) => {
  const arr = [...ids];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const orderQuestionsByIds = (sanitized, idOrder) => {
  const byId = new Map(sanitized.map((q) => [String(q._id), q]));
  return idOrder.map((oid) => byId.get(String(oid))).filter(Boolean);
};

const normalizeForCompare = (value) => String(value ?? "").trim().toLowerCase();

const getScheduledDate = (quiz) => {
  if (!quiz?.scheduled || !quiz?.scheduleDate || !quiz?.scheduleTime) return null;
  return new Date(`${quiz.scheduleDate}T${quiz.scheduleTime}`);
};

const ensureQuizCanBeAttempted = async (quiz) => {
  if (!quiz || quiz.isDeleted) return { ok: false, message: "Quiz not found" };
  if (quiz.status === "closed") return { ok: false, message: "Quiz is closed" };
  if (quiz.status === "scheduled") {
    const scheduledAt = getScheduledDate(quiz);
    if (scheduledAt && scheduledAt <= new Date()) {
      await Quiz.updateOne({ _id: quiz._id }, { $set: { status: "live", scheduled: false } });
      quiz.status = "live";
      quiz.scheduled = false;
    } else {
      return { ok: false, message: "Quiz is not live yet" };
    }
  }
  return { ok: true };
};

const sanitizeQuestionForAttempt = (question, quiz) => ({
  _id: question._id,
  order: question.order,
  text: question.text,
  optionType: question.optionType,
  mark: question.mark,
  negative: question.negative,
  timeSeconds: question.timeSeconds ?? (quiz.wholeOrPerQuestion === "per" ? quiz.pqtDefaultSeconds : null),
  options: (question.options || []).map((opt) => ({
    _id: opt._id,
    text: opt.text,
  })),
});

const isAnswerCorrect = (question, answer) => {
  const type = question.optionType;
  if (answer === undefined || answer === null || answer === "") return false;

  if (type === "radio" || type === "selection") {
    return normalizeForCompare(answer) === normalizeForCompare(question.rightAnswer);
  }

  if (type === "short-answer") {
    return normalizeForCompare(answer) === normalizeForCompare(question.rightAnswer);
  }

  if (type === "checkbox") {
    const correct = Array.isArray(question.rightAnswer) ? question.rightAnswer.map(normalizeForCompare).sort() : [];
    const user = Array.isArray(answer) ? answer.map(normalizeForCompare).sort() : [];
    return correct.length > 0 && correct.length === user.length && correct.every((v, i) => v === user[i]);
  }

  return false;
};

const evaluateAttempt = (quiz, questions, answers) => {
  let score = 0;
  for (const question of questions) {
    const qid = String(question._id);
    const answer = answers?.[qid];
    if (answer === undefined || answer === null || answer === "" || (Array.isArray(answer) && !answer.length)) {
      continue;
    }
    const correct = isAnswerCorrect(question, answer);
    if (correct) {
      score += Number(question.mark || 0);
      continue;
    }

    if (quiz.negativeMarking) {
      const questionNegative = question.negative ?? null;
      const penalty = questionNegative !== null ? Number(questionNegative || 0) : Number(quiz.negativeDefault || 0);
      score -= penalty;
    }
  }

  const totalMarks = Number(quiz.totalMarks || 0);
  const boundedScore = clamp(score, 0, totalMarks);
  const percentageScore = totalMarks > 0 ? (boundedScore / totalMarks) * 100 : 0;
  return { score: boundedScore, percentageScore, totalMarks };
};

const evaluateAttemptDetailed = (quiz, questions, answers) => {
  const details = [];
  let score = 0;
  for (const question of questions) {
    const qid = String(question._id);
    const answer = answers?.[qid];
    const attempted = !(
      answer === undefined ||
      answer === null ||
      answer === "" ||
      (Array.isArray(answer) && !answer.length)
    );
    const correct = attempted ? isAnswerCorrect(question, answer) : false;
    let marksAwarded = 0;

    if (attempted && correct) {
      marksAwarded = Number(question.mark || 0);
      score += marksAwarded;
    } else if (attempted && quiz.negativeMarking) {
      const questionNegative = question.negative ?? null;
      const penalty = questionNegative !== null ? Number(questionNegative || 0) : Number(quiz.negativeDefault || 0);
      marksAwarded = -penalty;
      score += marksAwarded;
    }

    details.push({
      questionId: question._id,
      questionText: question.text,
      optionType: question.optionType,
      selectedAnswer: answer ?? null,
      correctAnswer: question.rightAnswer ?? null,
      isCorrect: attempted ? correct : false,
      attempted,
      marks: Number(question.mark || 0),
      marksAwarded,
    });
  }

  const totalMarks = Number(quiz.totalMarks || 0);
  const boundedScore = clamp(score, 0, totalMarks);
  const percentageScore = totalMarks > 0 ? (boundedScore / totalMarks) * 100 : 0;
  return { score: boundedScore, percentageScore, totalMarks, details };
};

const normalizeCsvCell = (value) => {
  const s = String(value ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

// GET /api/quizzes/attempts/me - participant attempt dashboard list
router.get("/attempts/me", auth, async (req, res) => {
  try {
    const attempts = await Attempt.find({ participant: req.user.id })
      .populate("quiz", "title quizId totalMarks")
      .sort({ updatedAt: -1 })
      .lean();

    return res.json({
      attempts: attempts.map((a, i) => ({
        _id: a._id,
        sr: i + 1,
        quizId: a.quiz?.quizId || "",
        title: a.quiz?.title || "Deleted Quiz",
        status: a.status,
        score: a.score ?? 0,
        percentageScore: a.percentageScore ?? 0,
        attemptDate: (a.submittedAt || a.updatedAt || a.createdAt)?.toISOString?.().slice(0, 10) || "",
        result: a.status === "submitted" && a.resultPublished ? "Published" : "Not published",
      })),
    });
  } catch (err) {
    console.error("Attempt dashboard fetch error:", err);
    return res.status(500).json({ message: "Failed to fetch attempts" });
  }
});

// GET /api/quizzes/attempts/:attemptId/result - result overview + per-question evaluation
router.get("/attempts/:attemptId/result", auth, async (req, res) => {
  try {
    const attemptId = req.params.attemptId;
    if (!mongoose.Types.ObjectId.isValid(attemptId)) {
      return res.status(400).json({ message: "Invalid attempt ID" });
    }

    const attempt = await Attempt.findOne({ _id: attemptId, participant: req.user.id }).lean();
    if (!attempt) return res.status(404).json({ message: "Attempt not found" });
    if (attempt.status !== "submitted") {
      return res.status(409).json({ message: "Attempt not submitted yet" });
    }
    if (!attempt.resultPublished) {
      return res.status(403).json({ message: "Result is not published yet by creator" });
    }

    const quiz = await Quiz.findById(attempt.quiz).lean();
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });

    const questions = await Question.find({ quiz: quiz._id }).sort({ order: 1 }).lean();
    const evaluated = evaluateAttemptDetailed(quiz, questions, attempt.answers || {});

    return res.json({
      attempt: {
        _id: attempt._id,
        status: attempt.status,
        submittedAt: attempt.submittedAt,
        timeSpentSec: attempt.timeSpentSec,
      },
      quiz: {
        _id: quiz._id,
        quizId: quiz.quizId,
        title: quiz.title,
      },
      summary: {
        score: Number(attempt.score ?? evaluated.score),
        totalMarks: evaluated.totalMarks,
        percentageScore: Number((attempt.percentageScore ?? evaluated.percentageScore).toFixed(2)),
      },
      questions: evaluated.details,
    });
  } catch (err) {
    console.error("Attempt result fetch error:", err);
    return res.status(500).json({ message: "Failed to load attempt result" });
  }
});

// POST /api/quizzes/attempts/verify - verify quiz code/pass and return quiz info
router.post("/attempts/verify", auth, async (req, res) => {
  try {
    const quizCode = String(req.body?.quizCode || "").trim().toUpperCase();
    const quizPass = String(req.body?.quizPass || "").trim();
    if (!quizCode || !quizPass) {
      return res.status(400).json({ message: "Quiz code and pass are required" });
    }

    const quiz = await Quiz.findOne({ quizId: quizCode, isDeleted: false }).lean();
    if (!quiz || quiz.quizPass !== quizPass) {
      return res.status(401).json({ message: "Invalid quiz code or pass" });
    }
    if (String(quiz.creator) === String(req.user.id)) {
      return res.status(403).json({ message: "Quiz creator cannot attempt their own quiz" });
    }

    const access = await ensureQuizCanBeAttempted(quiz);
    if (!access.ok) return res.status(400).json({ message: access.message });

    const attempted = await Attempt.findOne({ quiz: quiz._id, participant: req.user.id }).lean();
    const questions = await Question.find({ quiz: quiz._id }).select("timeSeconds").lean();
    const totalQuestions = questions.length;
    const perQuestionTotalSec = questions.reduce(
      (sum, q) => sum + Number(q.timeSeconds ?? quiz.pqtDefaultSeconds ?? 0),
      0
    );

    return res.json({
      canAttempt: !attempted || attempted.status === "in-progress",
      alreadyAttempted: !!attempted && attempted.status !== "in-progress",
      existingAttemptId: attempted?._id || null,
      quiz: {
        _id: quiz._id,
        quizId: quiz.quizId,
        title: quiz.title,
        timed: !!quiz.timedQuiz,
        negativeMarking: !!quiz.negativeMarking,
        totalQuestions,
        maxMarks: Number(quiz.totalMarks || 0),
        totalTimeMinutes:
          quiz.wholeOrPerQuestion === "whole"
            ? Number(quiz.wholeDurationMinutes || 0)
            : Number((perQuestionTotalSec / 60).toFixed(2)),
        wholeOrPerQuestion: quiz.wholeOrPerQuestion,
        pqtDefaultSeconds: quiz.pqtDefaultSeconds,
        shuffle: !!quiz.shuffle,
      },
    });
  } catch (err) {
    console.error("Attempt verify error:", err);
    return res.status(500).json({ message: "Failed to verify quiz" });
  }
});

// POST /api/quizzes/attempts/start - create/reuse in-progress attempt
router.post("/attempts/start", auth, async (req, res) => {
  try {
    const quizCode = String(req.body?.quizCode || "").trim().toUpperCase();
    const quizPass = String(req.body?.quizPass || "").trim();
    if (!quizCode || !quizPass) {
      return res.status(400).json({ message: "Quiz code and pass are required" });
    }

    const quiz = await Quiz.findOne({ quizId: quizCode, isDeleted: false });
    if (!quiz || quiz.quizPass !== quizPass) {
      return res.status(401).json({ message: "Invalid quiz code or pass" });
    }
    if (String(quiz.creator) === String(req.user.id)) {
      return res.status(403).json({ message: "Quiz creator cannot attempt their own quiz" });
    }

    const access = await ensureQuizCanBeAttempted(quiz);
    if (!access.ok) return res.status(400).json({ message: access.message });

    let attempt = await Attempt.findOne({ quiz: quiz._id, participant: req.user.id });
    if (attempt && attempt.status === "submitted") {
      return res.status(409).json({ message: "You already submitted this quiz", attemptId: attempt._id });
    }

    if (!attempt) {
      attempt = await Attempt.create({
        quiz: quiz._id,
        participant: req.user.id,
        status: "in-progress",
        answers: {},
        lastActiveAt: new Date(),
      });
    } else {
      attempt.lastActiveAt = new Date();
      await attempt.save();
    }

    return res.status(201).json({ message: "Attempt ready", attemptId: attempt._id, quizId: quiz._id });
  } catch (err) {
    console.error("Attempt start error:", err);
    return res.status(500).json({ message: "Failed to start attempt" });
  }
});

// GET /api/quizzes/vaults/creator - creator vault list with quizzes
router.get("/vaults/creator", auth, async (req, res) => {
  try {
    const vaults = await Vault.find({ creator: req.user.id })
      .populate({
        path: "quizzes",
        match: { isDeleted: false },
        select: "quizId title status totalAttempts averageScore highestScore updatedAt",
      })
      .sort({ updatedAt: -1 })
      .lean();
    return res.json({ vaults });
  } catch (err) {
    console.error("Creator vault fetch error:", err);
    return res.status(500).json({ message: "Failed to fetch vaults" });
  }
});

// POST /api/quizzes/vaults - create vault
router.post("/vaults", auth, async (req, res) => {
  try {
    const name = String(req.body?.name || "").trim();
    const description = String(req.body?.description || "").trim();
    if (!name) return res.status(400).json({ message: "Vault name is required" });

    const existing = await Vault.findOne({ creator: req.user.id, name });
    if (existing) return res.status(409).json({ message: "Vault name already exists" });

    const vault = await Vault.create({
      creator: req.user.id,
      name,
      description,
      quizzes: [],
    });
    return res.status(201).json({ message: "Vault created", vault });
  } catch (err) {
    console.error("Create vault error:", err);
    return res.status(500).json({ message: "Failed to create vault" });
  }
});

// PATCH /api/quizzes/vaults/:vaultId/quizzes - add/remove creator's quiz
router.patch("/vaults/:vaultId/quizzes", auth, async (req, res) => {
  try {
    const { vaultId } = req.params;
    const { quizId, action } = req.body || {};
    if (!mongoose.Types.ObjectId.isValid(vaultId) || !mongoose.Types.ObjectId.isValid(quizId)) {
      return res.status(400).json({ message: "Invalid vault or quiz ID" });
    }
    if (!["add", "remove"].includes(action)) {
      return res.status(400).json({ message: "Invalid action" });
    }

    const [vault, quiz] = await Promise.all([
      Vault.findOne({ _id: vaultId, creator: req.user.id }),
      Quiz.findOne({ _id: quizId, creator: req.user.id, isDeleted: false }),
    ]);
    if (!vault) return res.status(404).json({ message: "Vault not found" });
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });

    if (action === "add") {
      await Vault.updateOne({ _id: vault._id }, { $addToSet: { quizzes: quiz._id } });
    } else {
      await Vault.updateOne({ _id: vault._id }, { $pull: { quizzes: quiz._id } });
    }

    return res.json({ message: action === "add" ? "Quiz added to vault" : "Quiz removed from vault" });
  } catch (err) {
    console.error("Vault quiz update error:", err);
    return res.status(500).json({ message: "Failed to update vault" });
  }
});

// GET /api/quizzes/vaults/:vaultId/report - creator aggregated report for vault quizzes
router.get("/vaults/:vaultId/report", auth, async (req, res) => {
  try {
    const { vaultId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(vaultId)) {
      return res.status(400).json({ message: "Invalid vault ID" });
    }

    const vault = await Vault.findOne({ _id: vaultId, creator: req.user.id })
      .populate({
        path: "quizzes",
        match: { isDeleted: false },
        select: "_id title totalMarks",
      })
      .lean();
    if (!vault) return res.status(404).json({ message: "Vault not found" });
    const vaultQuizzes = (vault.quizzes || []).filter(Boolean).map((q) => ({
      _id: q._id,
      title: q.title || "Untitled Quiz",
      totalMarks: Number(q.totalMarks || 0),
    }));
    const quizIds = vaultQuizzes.map((q) => q._id);
    if (!quizIds.length) return res.json({ vault: { _id: vault._id, name: vault.name }, rows: [], csv: "" });

    const attempts = await Attempt.find({ quiz: { $in: quizIds }, status: "submitted" })
      .populate("participant", "name email")
      .populate("quiz", "_id title totalMarks")
      .lean();

    const participantRows = new Map();
    const vaultQuizIdSet = new Set(vaultQuizzes.map((q) => String(q._id)));
    const quizKeyById = new Map(
      vaultQuizzes.map((q) => [String(q._id), `${q.title} (${q.totalMarks})`])
    );

    for (const a of attempts) {
      const quizId = String(a.quiz?._id || "");
      if (!vaultQuizIdSet.has(quizId)) continue;

      const participantId = String(a.participant?._id || "unknown");
      const participantName = a.participant?.name || "Unknown";
      const participantEmail = a.participant?.email || "";
      const score = Number(a.score || 0);

      if (!participantRows.has(participantId)) {
        participantRows.set(participantId, {
          participantName,
          participantEmail,
          quizScores: {},
          participantTotalMarks: 0,
        });
      }

      const row = participantRows.get(participantId);
      const quizColumnKey = quizKeyById.get(quizId);
      row.quizScores[quizColumnKey] = score;
      row.participantTotalMarks += score;
    }

    const sumTotalMarksAllQuizzes = vaultQuizzes.reduce((sum, q) => sum + Number(q.totalMarks || 0), 0);
    const quizColumns = vaultQuizzes.map((q) => `${q.title} (${q.totalMarks})`);

    const rows = Array.from(participantRows.values())
      .map((row) => {
        const percentage =
          sumTotalMarksAllQuizzes > 0 ? (row.participantTotalMarks / sumTotalMarksAllQuizzes) * 100 : 0;
        return {
          participantName: row.participantName,
          participantEmail: row.participantEmail,
          ...quizColumns.reduce((acc, col) => {
            acc[col] = Object.prototype.hasOwnProperty.call(row.quizScores, col) ? row.quizScores[col] : "";
            return acc;
          }, {}),
          sumTotalMarksAllQuizzes,
          sumTotalParticipantMarks: Number(row.participantTotalMarks.toFixed(2)),
          percentage: Number(percentage.toFixed(2)),
        };
      })
      .sort((a, b) => a.participantName.localeCompare(b.participantName));

    const csvHeader = [
      "Participant Name",
      ...quizColumns,
      "sum of total marks of all quizzes",
      "sum of total participant marks",
      "Percentage",
    ];

    const csvLines = [
      csvHeader.map(normalizeCsvCell).join(","),
      ...rows.map((r) =>
        [
          r.participantName,
          ...quizColumns.map((col) => r[col]),
          r.sumTotalMarksAllQuizzes,
          r.sumTotalParticipantMarks,
          `${r.percentage}%`,
        ]
          .map(normalizeCsvCell)
          .join(",")
      ),
    ];

    return res.json({
      vault: { _id: vault._id, name: vault.name },
      columns: csvHeader,
      rows,
      csv: csvLines.join("\n"),
    });
  } catch (err) {
    console.error("Vault report error:", err);
    return res.status(500).json({ message: "Failed to generate vault report" });
  }
});

// GET /api/quizzes/vaults/participant - vaults containing participant attempted quizzes + analytics
router.get("/vaults/participant", auth, async (req, res) => {
  try {
    const attempts = await Attempt.find({ participant: req.user.id, status: "submitted" })
      .populate("quiz", "_id title isDeleted")
      .lean();
    const attemptedQuizIds = attempts.map((a) => a.quiz?._id).filter(Boolean);
    if (!attemptedQuizIds.length) return res.json({ vaults: [] });

    const vaults = await Vault.find({ quizzes: { $in: attemptedQuizIds } })
      .populate({ path: "quizzes", select: "_id title isDeleted" })
      .lean();

    const attemptsByQuiz = new Map(attempts.map((a) => [String(a.quiz?._id), a]));
    const response = vaults.map((v) => {
      const quizSummaries = (v.quizzes || [])
        .filter((q) => !!attemptsByQuiz.get(String(q._id)))
        .map((q) => {
          const a = attemptsByQuiz.get(String(q._id));
          return {
            quizId: q._id,
            quizTitle: q.title,
            score: Number(a.score || 0),
            percentageScore: Number(Number(a.percentageScore || 0).toFixed(2)),
            submittedAt: a.submittedAt,
          };
        });

      const totalScore = quizSummaries.reduce((s, r) => s + r.score, 0);
      const avgPercent = quizSummaries.length
        ? quizSummaries.reduce((s, r) => s + r.percentageScore, 0) / quizSummaries.length
        : 0;
      return {
        _id: v._id,
        name: v.name,
        description: v.description || "",
        quizzes: quizSummaries,
        analytics: {
          attemptedCount: quizSummaries.length,
          totalScore,
          averagePercentage: Number(avgPercent.toFixed(2)),
        },
      };
    });

    return res.json({ vaults: response });
  } catch (err) {
    console.error("Participant vault fetch error:", err);
    return res.status(500).json({ message: "Failed to fetch vault analysis" });
  }
});

// GET /api/quizzes/attempts/:attemptId/session - load quiz questions and current answers
router.get("/attempts/:attemptId/session", auth, async (req, res) => {
  try {
    const attemptId = req.params.attemptId;
    if (!mongoose.Types.ObjectId.isValid(attemptId)) {
      return res.status(400).json({ message: "Invalid attempt ID" });
    }

    const attempt = await Attempt.findOne({ _id: attemptId, participant: req.user.id });
    if (!attempt) return res.status(404).json({ message: "Attempt not found" });

    const quiz = await Quiz.findById(attempt.quiz).lean();
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });

    const questions = await Question.find({ quiz: quiz._id })
      .populate("options")
      .sort({ order: 1 })
      .lean();

    const sanitizedQuestions = questions.map((q) => sanitizeQuestionForAttempt(q, quiz));

    let orderedQuestions = sanitizedQuestions;
    if (quiz.shuffle) {
      const expectedIds = sanitizedQuestions.map((x) => String(x._id));
      const idSet = new Set(expectedIds);
      const stored = (attempt.shuffledQuestionIds || []).map((id) => String(id));
      const orderValid =
        stored.length === expectedIds.length && stored.every((id) => idSet.has(id));
      let idOrder = stored;
      if (!orderValid) {
        idOrder = shuffleIdsFisherYates(expectedIds);
        attempt.shuffledQuestionIds = idOrder.map((hex) => new mongoose.Types.ObjectId(hex));
        await attempt.save();
      }
      orderedQuestions = orderQuestionsByIds(sanitizedQuestions, idOrder);
    } else if (attempt.shuffledQuestionIds?.length) {
      attempt.shuffledQuestionIds = [];
      await attempt.save();
    }

    attempt.lastActiveAt = new Date();
    await attempt.save();

    return res.json({
      attempt: {
        _id: attempt._id,
        status: attempt.status,
        answers: attempt.answers || {},
        submittedAt: attempt.submittedAt,
      },
      quiz: {
        _id: quiz._id,
        quizId: quiz.quizId,
        title: quiz.title,
        timedQuiz: quiz.timedQuiz,
        wholeOrPerQuestion: quiz.wholeOrPerQuestion,
        wholeDurationMinutes: quiz.wholeDurationMinutes,
        pqtDefaultSeconds: quiz.pqtDefaultSeconds,
        negativeMarking: quiz.negativeMarking,
        negativeDefault: quiz.negativeDefault,
        totalMarks: quiz.totalMarks,
        shuffle: !!quiz.shuffle,
        unavailableForNewAttempts: quiz.isDeleted || quiz.status === "closed",
      },
      questions: orderedQuestions,
    });
  } catch (err) {
    console.error("Attempt session fetch error:", err);
    return res.status(500).json({ message: "Failed to load attempt session" });
  }
});

// PATCH /api/quizzes/attempts/:attemptId/answer - save one question answer
router.patch("/attempts/:attemptId/answer", auth, async (req, res) => {
  try {
    const attemptId = req.params.attemptId;
    const questionId = String(req.body?.questionId || "").trim();
    const answer = req.body?.answer;

    if (!mongoose.Types.ObjectId.isValid(attemptId) || !mongoose.Types.ObjectId.isValid(questionId)) {
      return res.status(400).json({ message: "Invalid attempt or question ID" });
    }

    const attempt = await Attempt.findOne({ _id: attemptId, participant: req.user.id });
    if (!attempt) return res.status(404).json({ message: "Attempt not found" });
    if (attempt.status !== "in-progress") {
      return res.status(409).json({ message: "Attempt is already submitted" });
    }

    attempt.answers = { ...(attempt.answers || {}), [questionId]: answer };
    attempt.lastActiveAt = new Date();
    await attempt.save();

    return res.json({ message: "Answer saved" });
  } catch (err) {
    console.error("Save answer error:", err);
    return res.status(500).json({ message: "Failed to save answer" });
  }
});

// POST /api/quizzes/attempts/:attemptId/submit - finalize attempt and compute score
router.post("/attempts/:attemptId/submit", auth, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const attemptId = req.params.attemptId;
    if (!mongoose.Types.ObjectId.isValid(attemptId)) {
      return res.status(400).json({ message: "Invalid attempt ID" });
    }

    const attempt = await Attempt.findOne({ _id: attemptId, participant: req.user.id }).session(session);
    if (!attempt) return res.status(404).json({ message: "Attempt not found" });
    if (attempt.status === "submitted") {
      return res.json({
        message: "Attempt already submitted",
        score: attempt.score,
        percentageScore: attempt.percentageScore,
      });
    }

    const quiz = await Quiz.findById(attempt.quiz).session(session);
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });

    const questions = await Question.find({ quiz: quiz._id }).session(session).lean();
    const evaluated = evaluateAttempt(quiz, questions, attempt.answers || {});
    const now = new Date();
    const createdAt = attempt.createdAt || now;
    const timeSpentSec = Math.max(0, Math.floor((now.getTime() - createdAt.getTime()) / 1000));

    attempt.status = "submitted";
    attempt.score = evaluated.score;
    attempt.percentageScore = evaluated.percentageScore;
    attempt.timeSpentSec = timeSpentSec;
    attempt.submittedAt = now;
    attempt.lastActiveAt = now;
    await attempt.save({ session });

    const agg = await Attempt.aggregate([
      { $match: { quiz: quiz._id, status: "submitted" } },
      {
        $group: {
          _id: null,
          totalAttempts: { $sum: 1 },
          averageScore: { $avg: "$score" },
          highestScore: { $max: "$score" },
        },
      },
    ]).session(session);

    const summary = agg[0] || { totalAttempts: 0, averageScore: 0, highestScore: 0 };
    quiz.totalAttempts = summary.totalAttempts;
    quiz.averageScore = summary.averageScore;
    quiz.highestScore = summary.highestScore;
    await quiz.save({ session });

    await session.commitTransaction();
    return res.json({
      message: "Quiz submitted successfully",
      result: {
        score: evaluated.score,
        totalMarks: evaluated.totalMarks,
        percentageScore: Number(evaluated.percentageScore.toFixed(2)),
        timeSpentSec,
      },
    });
  } catch (err) {
    await session.abortTransaction();
    console.error("Submit attempt error:", err);
    return res.status(500).json({ message: "Failed to submit attempt" });
  } finally {
    session.endSession();
  }
});

router.post("/", auth, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const creatorId = req.user.id;
    const body = req.body || {};

    if (!body.title || !body.quizPass || !Array.isArray(body.questions) || body.questions.length < 1) {
      return res.status(400).json({ message: "Invalid payload" });
    }

    const status = body.scheduled ? "scheduled" : "live";

    const quiz = await Quiz.create([{
      quizId: String(body.quizId || "").trim(),
      creator: creatorId,
      title: String(body.title).trim(),
      description: body.description || "",
      timedQuiz: !!body.timedQuiz,
      wholeOrPerQuestion: body.wholeOrPerQuestion === "per" ? "per" : "whole",
      wholeDurationMinutes: toInt(body.wholeDurationMinutes, 30),
      pqtDefaultSeconds: toInt(body.pqtDefaultSeconds, 60),
      shuffle: !!body.shuffle,
      negativeMarking: !!body.negativeMarking,
      negativeDefault: Number(body.negativeDefault ?? 0.25),
      scheduled: !!body.scheduled,
      scheduleDate: body.scheduled ? body.scheduleDate || null : null,
      scheduleTime: body.scheduled ? body.scheduleTime || null : null,
      quizPass: String(body.quizPass).trim(),
      status,
    }], { session });

    if (body.vaultId) {
      if (!mongoose.Types.ObjectId.isValid(body.vaultId)) {
        return res.status(400).json({ message: "Invalid vault ID" });
      }
      const vault = await Vault.findOne({ _id: body.vaultId, creator: creatorId }).session(session);
      if (!vault) {
        return res.status(404).json({ message: "Selected vault not found" });
      }
      vault.quizzes = Array.from(new Set([...(vault.quizzes || []).map(String), String(quiz[0]._id)])).map(
        (x) => new mongoose.Types.ObjectId(x)
      );
      await vault.save({ session });
    }

    let totalMarks = 0;

    for (const [idx, q] of body.questions.entries()) {
      const question = await Question.create([{
        quiz: quiz[0]._id,
        order: toInt(q.order, idx + 1),
        text: String(q.text || "").trim(),
        optionType: q.optionType || "radio",
        rightAnswer: q.rightAnswer ?? null,
        mark: Number(q.mark ?? 1),
        negative: q.negative ?? null,
        timeSeconds: q.timeSeconds ?? null,
      }], { session });

      totalMarks += Number(q.mark ?? 1);

      if (Array.isArray(q.options) && q.options.length) {
        const createdOptions = await Option.insertMany(
          q.options
            .map((txt) => String(txt || "").trim())
            .filter(Boolean)
            .map((txt) => ({
              question: question[0]._id,
              text: txt,
              isCorrect: Array.isArray(q.rightAnswer) ? q.rightAnswer.includes(txt) : q.rightAnswer === txt,
            })),
          { session }
        );
        await Question.updateOne(
          { _id: question[0]._id },
          { $set: { options: createdOptions.map((o) => o._id) } },
          { session }
        );
      }
    }

    await Quiz.updateOne({ _id: quiz[0]._id }, { $set: { totalMarks } }, { session });

    await session.commitTransaction();
    return res.status(201).json({ message: "Quiz created", quiz: { _id: quiz[0]._id, quizId: quiz[0].quizId } });
  } catch (e) {
    await session.abortTransaction();
    return res.status(500).json({ message: "Failed to create quiz" });
  } finally {
    session.endSession();
  }
});

router.get("/", auth, async (req, res) => {
  try {
    const page = Math.max(1, toInt(req.query.page, 1));
    const limit = Math.min(100, Math.max(1, toInt(req.query.limit, 20)));
    const skip = (page - 1) * limit;
    const q = String(req.query.q || "").trim();

  const creatorId = new mongoose.Types.ObjectId(req.user.id);
  const filter = { creator: creatorId, isDeleted: false };
    if (q) filter.$or = [{ title: { $regex: q, $options: "i" } }, { status: { $regex: q, $options: "i" } }];

    const [items, total] = await Promise.all([
      Quiz.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit).lean(),
      Quiz.countDocuments(filter),
    ]);

    return res.json({
      items: items.map((x, i) => ({
        _id: x._id,
        sr: skip + i + 1,
        title: x.title,
        status: x.status,
        lastUpdated: x.updatedAt?.toISOString?.().slice(0, 10) || "",
      })),
      page,
      limit,
      total,
    });
  } catch {
    return res.status(500).json({ message: "Failed to fetch quizzes" });
  }
});

router.get("/:id", auth, async (req, res) => {
  try {
    const quiz = await Quiz.findOne({ _id: req.params.id, creator: req.user.id, isDeleted: false })
      .populate("questions")
      .lean();
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });

    return res.json(quiz);
  } catch {
    return res.status(500).json({ message: "Failed to fetch quiz details" });
  }
});

router.delete("/:id", auth, async (req, res) => {
  try {
    const quiz = await Quiz.findOne({ _id: req.params.id, creator: req.user.id, isDeleted: false });
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });

    quiz.isDeleted = true;
    quiz.deletedAt = new Date();
    quiz.status = "closed";
    await quiz.save();

    return res.json({ message: "Quiz deleted" });
  } catch {
    return res.status(500).json({ message: "Delete failed" });
  }
});

module.exports = router;