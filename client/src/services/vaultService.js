import API from "./api";

export const getCreatorVaults = async () => {
  const { data } = await API.get("/quizzes/vaults/creator");
  return data;
};

export const createVault = async (payload) => {
  const { data } = await API.post("/quizzes/vaults", payload);
  return data;
};

export const updateVaultQuiz = async (vaultId, payload) => {
  const { data } = await API.patch(`/quizzes/vaults/${vaultId}/quizzes`, payload);
  return data;
};

export const getVaultReport = async (vaultId) => {
  const { data } = await API.get(`/quizzes/vaults/${vaultId}/report`, {
    params: { _t: Date.now() },
    headers: {
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
    },
  });
  return data;
};

export const getParticipantVaults = async () => {
  const { data } = await API.get("/quizzes/vaults/participant");
  return data;
};
