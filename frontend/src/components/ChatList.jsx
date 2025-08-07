import React from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  createConversation,
  deleteConversation,
  setActiveChatId,
  clearChatState, // <-- IMPORT THE NEW ACTION
} from "../slices/chatSlice";
import "../styles/ChatList.css";

const ChatList = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate(); // <-- Hook for navigation
  const { conversations, activeChatId } = useSelector((state) => state.chat);

  const handleNewChat = () => {
    dispatch(setActiveChatId(null));
  };

  const handleDelete = (e, chatId) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this chat?")) {
      dispatch(deleteConversation(chatId));
    }
  };

  
  const handleLogout = () => {
    dispatch(clearChatState()); // Clear Redux state
    localStorage.removeItem("adyaai_token"); // Remove token
    navigate("/login"); // Navigate to login page
  };

  return (
    <div className="chat-list-sidebar">
      
      <div className="sidebar-header">
        <h1>Chats</h1>
        <button className="new-chat-btn" onClick={handleNewChat}>
          + New Chat
        </button>
      </div>
      <ul className="conversation-list">
        {conversations.map((conv) => (
          <li
            key={conv.id}
            className={`conversation-item ${
              conv.id === activeChatId ? "active" : ""
            }`}
            onClick={() => dispatch(setActiveChatId(conv.id))}
          >
            <span className="conversation-title">{conv.heading}</span>
            <button
              className="delete-chat-btn"
              onClick={(e) => handleDelete(e, conv.id)}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
      <div className="sidebar-footer">
        {/* ***** ADD THE LOGOUT BUTTON ***** */}
        <button className="logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </div>
  );
};

export default ChatList;
