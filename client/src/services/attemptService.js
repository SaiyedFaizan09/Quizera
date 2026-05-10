import API from "./api";

export const getMyAttempts = async () => {
  const { data } = await API.get("/quizzes/attempts/me");
  return data;
};

export const verifyAttemptAccess = async (payload) => {
  const { data } = await API.post("/quizzes/attempts/verify", payload);
  return data;
};

export const startAttempt = async (payload) => {
  const { data } = await API.post("/quizzes/attempts/start", payload);
  return data;
};

export const getAttemptSession = async (attemptId) => {
  const { data } = await API.get(`/quizzes/attempts/${attemptId}/session`);
  return data;
};

export const saveAttemptAnswer = async (attemptId, payload) => {
  const { data } = await API.patch(`/quizzes/attempts/${attemptId}/answer`, payload);
  return data;
};

export const submitAttempt = async (attemptId) => {
  const { data } = await API.post(`/quizzes/attempts/${attemptId}/submit`);
  return data;
};

export const getAttemptResult = async (attemptId) => {
  const { data } = await API.get(`/quizzes/attempts/${attemptId}/result`);
  return data;
};
