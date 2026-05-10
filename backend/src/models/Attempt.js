const mongoose = require("mongoose");

const attemptSchema = new mongoose.Schema(
  {
    quiz: { type: mongoose.Schema.Types.ObjectId, ref: "Quiz", required: true, index: true },
    participant: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    status: { type: String, enum: ["in-progress", "submitted", "abandoned"], default: "in-progress", index: true },
    score: { type: Number, default: 0, min: 0 },
    percentageScore: { type: Number, default: 0, min: 0, max: 100 },
    resultPublished: { type: Boolean, default: false, index: true },
    timeSpentSec: { type: Number, default: 0, min: 0 },
    answers: { type: mongoose.Schema.Types.Mixed, default: {} },
    /** When quiz.shuffle is true, fixed order of question _ids for this attempt (set on first session load). */
    shuffledQuestionIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Question" }],
    submittedAt: { type: Date, default: null },
    lastActiveAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

attemptSchema.index({ quiz: 1, participant: 1 }, { unique: true });
attemptSchema.index({ quiz: 1, status: 1 });

module.exports = mongoose.model("Attempt", attemptSchema);
