const Quiz = require("../models/Quiz");

const SCHEDULED_STATUSES = ["scheduled", "schedule"];
const JOB_INTERVAL_MS = 30 * 1000;

let timer = null;
let running = false;

function parseScheduleDateTime(quiz) {
  if (!quiz?.scheduleDate || !quiz?.scheduleTime) return null;
  const dt = new Date(`${quiz.scheduleDate}T${quiz.scheduleTime}`);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

async function promoteDueScheduledQuizzes() {
  if (running) return { updated: 0, skipped: true };
  running = true;

  try {
    const candidates = await Quiz.find({
      isDeleted: false,
      status: { $in: SCHEDULED_STATUSES },
      scheduled: true,
      scheduleDate: { $ne: null },
      scheduleTime: { $ne: null },
    })
      .select("_id scheduleDate scheduleTime")
      .lean();

    const now = new Date();
    const dueIds = candidates
      .filter((quiz) => {
        const scheduledAt = parseScheduleDateTime(quiz);
        return scheduledAt && scheduledAt <= now;
      })
      .map((quiz) => quiz._id);

    if (!dueIds.length) return { updated: 0, skipped: false };

    const result = await Quiz.updateMany(
      { _id: { $in: dueIds } },
      { $set: { status: "live", scheduled: false } }
    );

    return { updated: result.modifiedCount || 0, skipped: false };
  } catch (error) {
    console.error("[QUIZ_SCHEDULER] Failed to promote scheduled quizzes:", error);
    return { updated: 0, skipped: false, error: true };
  } finally {
    running = false;
  }
}

function startQuizScheduleJob() {
  if (timer) return;

  promoteDueScheduledQuizzes()
    .then((result) => {
      if (result.updated > 0) {
        console.log(`[QUIZ_SCHEDULER] Promoted ${result.updated} scheduled quiz(es) to live`);
      }
    })
    .catch((error) => {
      console.error("[QUIZ_SCHEDULER] Initial run failed:", error);
    });

  timer = setInterval(async () => {
    const result = await promoteDueScheduledQuizzes();
    if (result.updated > 0) {
      console.log(`[QUIZ_SCHEDULER] Promoted ${result.updated} scheduled quiz(es) to live`);
    }
  }, JOB_INTERVAL_MS);
}

module.exports = {
  promoteDueScheduledQuizzes,
  startQuizScheduleJob,
};
