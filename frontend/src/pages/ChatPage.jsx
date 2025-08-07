import React, { useState, useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import ChatList from "../components/ChatList";
import ChatMessage from "../components/ChatMessage";
import {
  fetchConversationHeaders,
  fetchConversationMessages,
  createConversation,
  addMessageToChat,
  removeLastMessageFromChat,
  updateConversation,
} from "../slices/chatSlice";
import { sendChatMessageToAI } from "../api/api";
import "../styles/ChatPage.css";

const ChatPage = () => {
  const dispatch = useDispatch();
  const chatEndRef = useRef(null);

  const { conversations, activeChatId, status } = useSelector(
    (state) => state.chat
  );
  const activeConversation = conversations.find((c) => c.id === activeChatId);
  const messages = activeConversation?.messages || [];
  const [input, setInput] = useState("");
  const [isAiResponding, setIsAiResponding] = useState(false);

  useEffect(() => {
    if (status === "idle") {
      dispatch(fetchConversationHeaders());
    }
  }, [status, dispatch]);
  useEffect(() => {
    if (activeChatId) {
      const conversation = conversations.find((c) => c.id === activeChatId);
      // If the conversation exists but its 'messages' array is empty (or not present),
      // it means we only have the header and need to fetch the full data.
      if (
        conversation &&
        (!conversation.messages || conversation.messages.length === 0)
      ) {
        // Check if it's a truly empty chat vs one whose messages just haven't been loaded
        // A newly created chat will have a message, so this logic is safe.
        // We can refine this by checking for a specific property if needed.
        dispatch(fetchConversationMessages(activeChatId));
      }
    }
  }, [activeChatId, conversations, dispatch]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    console.log(`[handleSend] 1. Triggered with input: "${input}"`);

    const userMessage = { text: input, isUser: true };
    const userInput = input; // Store input in a separate variable
    setInput(""); // Clear input field immediately

    let currentChatId = activeChatId;

    // If there is no active chat, we must create one first.
    if (!currentChatId) {
      try {
        const newConvAction = await dispatch(
          createConversation({ heading: userInput, messages: [userMessage] })
        );
        if (createConversation.fulfilled.match(newConvAction)) {
          currentChatId = newConvAction.payload.id;
        } else {
          return;
        }
      } catch (e) {
        return;
      }
    } else {
      // For existing chats, just add the message to the local state for now.
      dispatch(
        addMessageToChat({ chatId: currentChatId, message: userMessage })
      );
    }

    // --- AI Response Logic ---
    setIsAiResponding(true);
    // Add loading indicator
    dispatch(
      addMessageToChat({
        chatId: currentChatId,
        message: { text: "", isUser: false, loading: true },
      })
    );
    console.log("[handleSend] 3. Added loading indicator. Sending to AI...");

    try {
      const aiRes = await sendChatMessageToAI(userInput);
      console.log("[handleSend] 4. Received response from AI:", aiRes);

      // Remove the loading indicator
      dispatch(removeLastMessageFromChat(currentChatId));

      // Add the actual AI response
      if (aiRes && aiRes.reply) {
        dispatch(
          addMessageToChat({
            chatId: currentChatId,
            message: { text: aiRes.reply, isUser: false },
          })
        );

        // ***** SAVE THE CONVERSATION TO DB *****
        // After the AI replies and the local state is updated,
        // dispatch the thunk to save the entire conversation to the database.
        dispatch(updateConversation(currentChatId));
      } else {
        console.error("[handleSend] 5b. AI response was empty or malformed.");
        dispatch(
          addMessageToChat({
            chatId: currentChatId,
            message: {
              text: "Sorry, I received an empty response.",
              isUser: false,
            },
          })
        );
      }
    } catch (e) {
      console.error("[handleSend] 6. Error fetching AI response:", e);
      // Replace loading indicator with an error message
      dispatch(removeLastMessageFromChat(currentChatId));
      dispatch(
        addMessageToChat({
          chatId: currentChatId,
          message: { text: "Sorry, I ran into an error.", isUser: false },
        })
      );
    } finally {
      setIsAiResponding(false);
      console.log("[handleSend] 7. Finished.");
    }
  };

  return (
    <div className="chat-page-container">
      <ChatList />
      <div className="chat-window">
        <div className="messages-container">
          {activeConversation ? (
            messages.map((msg, idx) => (
              <ChatMessage
                key={idx}
                message={msg.text}
                isUser={msg.isUser}
                loading={msg.loading}
              />
            ))
          ) : (
            <div className="no-chat-selected">
              <h2>chatty</h2>
              <p>Select a conversation or start a new one.</p>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
        <div className="input-area">
          <div className="input-bar">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message here..."
              disabled={isAiResponding}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !isAiResponding) handleSend();
              }}
            />
            <button
              onClick={handleSend}
              disabled={isAiResponding || !input.trim()}
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
