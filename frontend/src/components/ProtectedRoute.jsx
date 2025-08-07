import React from "react";
import { Navigate, Outlet } from "react-router-dom";

const ProtectedRoute = () => {
  const token = localStorage.getItem("adyaai_token");

  // If there's a token, render the child route (ChatPage). Otherwise, navigate to login.
  return token ? <Outlet /> : <Navigate to="/login" replace />;
};

export default ProtectedRoute;
