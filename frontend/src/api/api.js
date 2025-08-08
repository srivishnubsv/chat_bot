import axios from "axios";

const API_BASE_URL = "http://localhost:8080";

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Interceptor to add the Authorization header to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("adyaai_token");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor for Global Error Handling (e.g., auto-logout on 401)
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem("adyaai_token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// --- Auth Endpoints (Public) ---
export const login = (email, password) =>
  axios.post(`${API_BASE_URL}/login`, { email, password });
export const signup = (name, email, password, age) =>
  axios.post(`${API_BASE_URL}/signup`, { name, email, password, age });

// --- Protected Endpoints ---
export const fetchConversationHeadersAPI = () => api.get("/api/conversations");
export const fetchConversationMessagesAPI = (chatId) =>
  api.get(`/api/conversations/${chatId}`);
export const createConversationAPI = (conversationData) =>
  api.post("/api/conversations", conversationData);
export const deleteConversationAPI = (chatId) =>
  api.delete(`/api/conversations/${chatId}`);
export const updateConversationAPI = (chatId, conversationData) =>
  api.put(`/api/conversations/${chatId}`, conversationData);

export const sendChatMessageToAI = async (message) => {
  const res = await api.post("/chatbot", { message });
  return res.data;
};

export default api;
