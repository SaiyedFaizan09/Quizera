const mongoose = require("mongoose");

const quizSchema = new mongoose.Schema(
  {
    quizId: { type: String, required: true, unique: true, trim: true, uppercase: true, maxlength: 32 },
    creator: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true, minlength: 3, maxlength: 120 },
    description: { type: String, default: "", maxlength: 1000, trim: true },

    timedQuiz: { type: Boolean, default: false },
    wholeOrPerQuestion: { type: String, enum: ["whole", "per"], default: "whole" },
    wholeDurationMinutes: { type: Number, min: 1, max: 720, default: 30 },
    pqtDefaultSeconds: { type: Number, min: 10, max: 3600, default: 60 },

    shuffle: { type: Boolean, default: false },
    negativeMarking: { type: Boolean, default: false },
    negativeDefault: { type: Number, min: 0, max: 100, default: 0.25 },

    scheduled: { type: Boolean, default: false },
    scheduleDate: { type: String, default: null },
    scheduleTime: { type: String, default: null },

    quizPass: { type: String, required: true, trim: true, minlength: 1, maxlength: 128 },

    status: { type: String, enum: ["live", "scheduled", "closed"], default: "live" },
    totalMarks: { type: Number, default: 0, min: 0 },

    totalAttempts: { type: Number, default: 0, min: 0 },
    averageScore: { type: Number, default: 0, min: 0 },
    highestScore: { type: Number, default: 0, min: 0 },

    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Quiz", quizSchema);
