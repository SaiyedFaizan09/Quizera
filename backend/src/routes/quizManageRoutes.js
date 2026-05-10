const express = require("express");
const mongoose = require("mongoose");
const Quiz = require("../models/Quiz");
const Question = require("../models/Question");
const Attempt = require("../models/Attempt");
const auth = require("../middlewares/authMiddleware");

const router = express.Router();

// GET /api/quizzes/:id/manage/overview - Quiz overview with stats
router.get("/:id/manage/overview", auth, async (req, res) => {
  try {
    const quizId = req.params.id;
    console.log("[OVERVIEW] Request for quiz ID:", quizId);
    console.log("[OVERVIEW] User ID:", req.user.id);
    
    if (!mongoose.Types.ObjectId.isValid(quizId)) {
      console.log("[OVERVIEW] Invalid ObjectId");
      return res.status(400).json({ message: "Invalid quiz ID" });
    }

    const quiz = await Quiz.findOne({
      _id: quizId,
      creator: req.user.id,
      isDeleted: false,
    }).lean();

    if (!quiz) {
      console.log("[OVERVIEW] Quiz not found or unauthorized");
      return res.status(404).json({ message: "Quiz not found" });
    }

    console.log("[OVERVIEW] Quiz found:", quiz.title);

    const questions = await Question.find({ quiz: quizId }).lean();
    const totalQuestions = questions.length;

    const liveThreshold = new Date(Date.now() - 5 * 60 * 1000);
    const liveAttemptingUsers = await Attempt.countDocuments({
      quiz: quizId,
      status: "in-progress",
      lastActiveAt: { $gte: liveThreshold },
    });

    console.log("[OVERVIEW] Success - returning data");
    return res.json({
      quiz: {
        ...quiz,
        totalQuestions,
      },
      analytics: {
        totalAttempts: quiz.totalAttempts || 0,
        averageScore: Number(Number(quiz.averageScore || 0).toFixed(2)),
        highestScore: quiz.highestScore || 0,
        liveAttemptingUsers,
      },
    });
  } catch (err) {
    console.error("[OVERVIEW] Error:", err);
    return res.status(500).json({ message: "Failed to fetch overview" });
  }
});

// GET /api/quizzes/:id/manage/stats - Detailed statistics
router.get("/:id/manage/stats", auth, async (req, res) => {
  try {
    const quizId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(quizId)) {
      return res.status(400).json({ message: "Invalid quiz ID" });
    }

    const quiz = await Quiz.findOne({
      _id: quizId,
      creator: req.user.id,
      isDeleted: false,
    }).lean();

    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    const [totalSubmitted, totalInProgress, avgScoreResult] = await Promise.all([
      Attempt.countDocuments({ quiz: quizId, status: "submitted" }),
      Attempt.countDocuments({ quiz: quizId, status: "in-progress" }),
      Attempt.aggregate([
        { $match: { quiz: new mongoose.Types.ObjectId(quizId), status: "submitted" } },
        { $group: { _id: null, avg: { $avg: "$score" }, max: { $max: "$score" } } },
      ]),
    ]);

    const avgScore = avgScoreResult[0]?.avg || 0;
    const maxScore = avgScoreResult[0]?.max || 0;

    return res.json({
      totalAttempts: totalSubmitted,
      inProgress: totalInProgress,
      averageScore: Math.round(avgScore * 100) / 100,
      highestScore: maxScore,
    });
  } catch (err) {
    console.error("Stats error:", err);
    return res.status(500).json({ message: "Failed to fetch stats" });
  }
});

// GET /api/quizzes/:id/manage/responses - All quiz responses
router.get("/:id/manage/responses", auth, async (req, res) => {
  try {
    const quizId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(quizId)) {
      return res.status(400).json({ message: "Invalid quiz ID" });
    }

    const quiz = await Quiz.findOne({
      _id: quizId,
      creator: req.user.id,
      isDeleted: false,
    });

    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    const responses = await Attempt.find({ quiz: quizId })
      .populate("participant", "name email")
      .sort({ submittedAt: -1, updatedAt: -1 })
      .lean();

    return res.json({
      responses: responses.map((r) => ({
        _id: r._id,
        participant: {
          name: r.participant?.name || "Unknown",
          email: r.participant?.email || "",
        },
        status: r.status,
        score: r.score,
        percentageScore: r.percentageScore,
        resultPublished: !!r.resultPublished,
        timeSpentSec: r.timeSpentSec,
        submittedAt: r.submittedAt,
        updatedAt: r.updatedAt,
      })),
    });
  } catch (err) {
    console.error("Responses error:", err);
    return res.status(500).json({ message: "Failed to fetch responses" });
  }
});

// PATCH /api/quizzes/:id/manage/publish-results - publish/unpublish submitted results
router.patch("/:id/manage/publish-results", auth, async (req, res) => {
  try {
    const quizId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(quizId)) {
      return res.status(400).json({ message: "Invalid quiz ID" });
    }

    const published = !!req.body?.published;
    const quiz = await Quiz.findOne({
      _id: quizId,
      creator: req.user.id,
      isDeleted: false,
    });
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });

    const result = await Attempt.updateMany(
      { quiz: quizId, status: "submitted" },
      { $set: { resultPublished: published } }
    );

    return res.json({
      message: published ? "Results published successfully" : "Results hidden successfully",
      updated: result.modifiedCount || 0,
      published,
    });
  } catch (err) {
    console.error("Publish results error:", err);
    return res.status(500).json({ message: "Failed to update result publishing" });
  }
});

// PATCH /api/quizzes/:id/status - Update quiz status (live/closed/scheduled)
router.patch("/:id/status", auth, async (req, res) => {
  try {
    const quizId = req.params.id;
    const normalizedStatus = req.body?.status === "schedule" ? "scheduled" : req.body?.status;

    if (!mongoose.Types.ObjectId.isValid(quizId)) {
      return res.status(400).json({ message: "Invalid quiz ID" });
    }

    if (!["live", "closed", "scheduled"].includes(normalizedStatus)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const quiz = await Quiz.findOne({
      _id: quizId,
      creator: req.user.id,
      isDeleted: false,
    });

    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    quiz.status = normalizedStatus;
    await quiz.save();

    return res.json({ message: "Status updated", quiz });
  } catch (err) {
    console.error("Status update error:", err);
    return res.status(500).json({ message: "Failed to update status" });
  }
});

// PUT /api/quizzes/:id - Update quiz details
router.put("/:id", auth, async (req, res) => {
  try {
    const quizId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(quizId)) {
      return res.status(400).json({ message: "Invalid quiz ID" });
    }

    const quiz = await Quiz.findOne({
      _id: quizId,
      creator: req.user.id,
      isDeleted: false,
    });

    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    const updates = req.body;
    const allowedFields = [
      "title",
      "description",
      "timedQuiz",
      "wholeOrPerQuestion",
      "wholeDurationMinutes",
      "pqtDefaultSeconds",
      "shuffle",
      "negativeMarking",
      "negativeDefault",
      "scheduled",
      "scheduleDate",
      "scheduleTime",
    ];

    // Validate schedule time is in the future
    if (updates.scheduled && updates.scheduleDate && updates.scheduleTime) {
      const scheduledDateTime = new Date(`${updates.scheduleDate}T${updates.scheduleTime}`);
      const now = new Date();
      
      if (scheduledDateTime <= now) {
        return res.status(400).json({ message: "Schedule time must be in the future" });
      }
      
      // Scheduling always puts quiz in scheduled state until schedule time is reached.
      quiz.status = "scheduled";
    } else if (updates.scheduled === false) {
      // If unscheduling, clear schedule data and set to live if was scheduled
      quiz.scheduleDate = null;
      quiz.scheduleTime = null;
      if (quiz.status === "scheduled") {
        quiz.status = "live";
      }
    }

    allowedFields.forEach((field) => {
      if (updates[field] !== undefined) {
        quiz[field] = updates[field];
      }
    });

    await quiz.save();

    return res.json({ message: "Quiz updated", quiz });
  } catch (err) {
    console.error("Update error:", err);
    return res.status(500).json({ message: "Failed to update quiz" });
  }
});

// GET /api/quizzes/:id/questions - Get all questions for a quiz
router.get("/:id/questions", auth, async (req, res) => {
  try {
    const quizId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(quizId)) {
      return res.status(400).json({ message: "Invalid quiz ID" });
    }

    const quiz = await Quiz.findOne({
      _id: quizId,
      creator: req.user.id,
      isDeleted: false,
    });

    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    const questions = await Question.find({ quiz: quizId })
      .populate("options")
      .sort({ order: 1 })
      .lean();

    return res.json({ questions });
  } catch (err) {
    console.error("Questions fetch error:", err);
    return res.status(500).json({ message: "Failed to fetch questions" });
  }
});

module.exports = router;
