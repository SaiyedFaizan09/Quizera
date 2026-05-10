import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000/api",
});

API.interceptors.request.use((req) => {
  const token = localStorage.getItem("token");
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  console.log("[API Request]", req.method.toUpperCase(), req.url);
  return req;
});

API.interceptors.response.use(
  (response) => {
    console.log("[API Response]", response.config.url, response.status);
    return response;
  },
  (error) => {
    console.error("[API Error]", error.config?.url, error.response?.status, error.response?.data);
    return Promise.reject(error);
  }
);

export default API;