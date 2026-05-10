const mongoose = require("mongoose");

const optionSchema = new mongoose.Schema(
  {
    question: { type: mongoose.Schema.Types.ObjectId, ref: "Question", required: true, index: true },
    text: { type: String, required: true, trim: true, minlength: 1, maxlength: 1000 },
    isCorrect: { type: Boolean, default: false },
  },
  { timestamps: true }
);

optionSchema.index({ question: 1 });

module.exports = mongoose.model("Option", optionSchema);
