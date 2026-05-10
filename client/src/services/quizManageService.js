import API from "./api";

// Overview (includes quiz + basic meta)
export const getOverview = async (quizId) => {
  const { data } = await API.get(`/quizzes/${quizId}/manage/overview`);
  return data;
};

// Stats (always allowed, 0 defaults if no attempts)
export const getStats = async (quizId) => {
  const { data } = await API.get(`/quizzes/${quizId}/manage/stats`);
  return data;
};

// Evaluation (only if closed; backend enforces)
export const getEvaluation = async (quizId) => {
  const { data } = await API.get(`/quizzes/${quizId}/manage/evaluation`);
  return data;
};

// Responses listing endpoint
export const getResponses = async (quizId) => {
  const { data } = await API.get(`/quizzes/${quizId}/manage/responses`);
  return data;
};

export const publishResults = async (quizId, published) => {
  const { data } = await API.patch(`/quizzes/${quizId}/manage/publish-results`, { published });
  return data;
};

// Get all questions for a quiz
export const getQuestions = async (quizId) => {
  const { data } = await API.get(`/quizzes/${quizId}/questions`);
  return data;
};

// Status transitions: live / closed; backend enforces matrix
export const updateStatus = async (quizId, status) => {
  const { data } = await API.patch(`/quizzes/${quizId}/status`, { status });
  return data;
};

// Edit quiz (only if allowed by status; backend enforces)
export const updateQuiz = async (quizId, payload) => {
  const { data } = await API.put(`/quizzes/${quizId}`, payload);
  return data;
};

// Soft delete quiz (owner-only)
export const softDelete = async (quizId) => {
  const { data } = await API.delete(`/quizzes/${quizId}`);
  return data;
};
