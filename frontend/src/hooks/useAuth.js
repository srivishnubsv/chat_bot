import { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { clearChatState } from "../slices/chatSlice";

export const useAuth = () => {
  const [token, setToken] = useState(() =>
    localStorage.getItem("adyaai_token")
  );
  const dispatch = useDispatch();

  // This effect listens for changes to localStorage from other tabs,
  // which keeps the authentication state in sync across the app.
  useEffect(() => {
    const handleStorageChange = () => {
      setToken(localStorage.getItem("adyaai_token"));
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const login = (newToken) => {
    localStorage.setItem("adyaai_token", newToken);
    setToken(newToken);
  };

  const logout = () => {
    dispatch(clearChatState()); // Clear Redux state first
    localStorage.removeItem("adyaai_token");
    setToken(null);
  };

  return {
    isAuthenticated: !!token,
    login,
    logout,
  };
};
