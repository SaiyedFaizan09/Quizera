const mongoose = require("mongoose");

const vaultSchema = new mongoose.Schema(
  {
    creator: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
    description: { type: String, default: "", trim: true, maxlength: 500 },
    quizzes: [{ type: mongoose.Schema.Types.ObjectId, ref: "Quiz" }],
  },
  { timestamps: true }
);

vaultSchema.index({ creator: 1, name: 1 }, { unique: true });

module.exports = mongoose.model("Vault", vaultSchema);
