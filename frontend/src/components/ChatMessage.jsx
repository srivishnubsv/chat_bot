import React from "react";

const ChatMessage = ({ message, isUser, loading }) => (
  <div className={`chat-message ${isUser ? "user" : "ai"}`}>
    {loading ? <span className="loading-dot">...</span> : message}
  </div>
);

export default ChatMessage;
