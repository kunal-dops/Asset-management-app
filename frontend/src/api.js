import axios from "axios";

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
});
export default API;
export const getApiErrorMessage = (err, fallback = "Something went wrong. Please try again.") => {
  return (
    err?.response?.data?.details ||
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    err?.message ||
    fallback
  );
};

// Attach token automatically
API.interceptors.request.use((req) => {
  const token = localStorage.getItem("token");
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});

// Auto-logout on 401 (expired/invalid token)
API.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/";
    }
    return Promise.reject(err);
  }
);

export default API;
