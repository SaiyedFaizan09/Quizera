const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema(
  {
    quiz: { type: mongoose.Schema.Types.ObjectId, ref: "Quiz", required: true, index: true },
    order: { type: Number, required: true, min: 1 },
    text: { type: String, required: true, trim: true, minlength: 1, maxlength: 5000 },
    type: { type: String, enum: ["text"], default: "text" },
    optionType: { type: String, enum: ["radio", "checkbox", "short-answer", "selection"], default: "radio" },
    options: [{ type: mongoose.Schema.Types.ObjectId, ref: "Option" }],
    rightAnswer: { type: mongoose.Schema.Types.Mixed, default: null },
    mark: { type: Number, min: 0, max: 1000, default: 1 },
    negative: { type: Number, min: 0, max: 1000, default: null },
    timeSeconds: { type: Number, min: 1, max: 3600, default: null },
  },
  { timestamps: true }
);

questionSchema.index({ quiz: 1, order: 1 }, { unique: true });

module.exports = mongoose.model("Question", questionSchema);
