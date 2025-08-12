import React, { useState, useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { store } from "../app/store";
import ChatList from "../components/ChatList";
import ChatMessage from "../components/ChatMessage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SendHorizonal, Bot } from "lucide-react";
import {
  fetchConversationHeaders,
  fetchConversationMessages,
  createConversation,
  updateConversation,
  addMessageToChat,
  removeLastMessageFromChat,
} from "../slices/chatSlice";
import { sendChatMessageToAI } from "../api/api";

const ChatPage = () => {
  const dispatch = useDispatch();
  const messagesEndRef = useRef(null);

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
      if (conversation && !conversation.messages) {
        dispatch(fetchConversationMessages(activeChatId));
      }
    }
  }, [activeChatId, conversations, dispatch]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // This is the new, more robust handleSend function.
  // ... inside the ChatPage component

  const handleSend = async () => {
    if (!input.trim()) return;

    const userInput = input;
    const userMessage = { text: userInput, isUser: true };
    setInput("");

    const currentChatId = activeChatId;

    console.log(
      `%c--- [NEW MESSAGE] ---`,
      "color: #00A36C; font-weight: bold;"
    );
    console.log(`1. User input: "${userInput}"`);
    console.log(`2. Active Chat ID: ${currentChatId}`);

    if (!currentChatId) {
      // --- LOGIC FOR A NEW CONVERSATION ---
      console.log("3a. Path: Starting a NEW conversation.");
      setIsAiResponding(true);
      await dispatch(
        createConversation({ heading: userInput, messages: [userMessage] })
      );
      setIsAiResponding(false);
      console.log(
        "3b. New conversation created and initial response received."
      );
    } else {
      // --- LOGIC FOR AN EXISTING CONVERSATION ---
      console.log("3a. Path: Adding to an EXISTING conversation.");

      const conversationBeforeUpdate = conversations.find(
        (c) => c.id === currentChatId
      );

      // This is a critical check.
      if (!conversationBeforeUpdate) {
        console.error(
          "CRITICAL ERROR: Could not find active conversation in state before updating. Aborting."
        );
        return;
      }

      console.log(
        "3b. Conversation state BEFORE adding new user message:",
        conversationBeforeUpdate
      );

      // This is the array we will build our history from.
      const messagesForHistory = [
        ...conversationBeforeUpdate.messages,
        userMessage,
      ];

      console.log(
        `3c. Messages to be used for history array (length: ${messagesForHistory.length}):`,
        messagesForHistory
      );

      const historyForAI = messagesForHistory.map((msg) => ({
        role: msg.isUser ? "user" : "model",
        text: msg.text,
      }));

      console.log(
        `4a. CONSTRUCTED HISTORY for AI (length: ${historyForAI.length}):`,
        historyForAI
      );

      // Check if the history is empty before sending
      if (historyForAI.length === 0) {
        console.error(
          "CRITICAL ERROR: History for AI is empty. Aborting API call."
        );
        return;
      }

      // Optimistic UI updates
      dispatch(
        addMessageToChat({ chatId: currentChatId, message: userMessage })
      );
      setIsAiResponding(true);
      dispatch(
        addMessageToChat({
          chatId: currentChatId,
          message: { text: "", isUser: false, loading: true },
        })
      );

      try {
        console.log("4b. Sending the history to the /chatbot endpoint...");
        const aiRes = await sendChatMessageToAI(historyForAI);
        console.log("5. Received response from AI:", aiRes);

        dispatch(removeLastMessageFromChat(currentChatId));
        if (aiRes && aiRes.reply) {
          dispatch(
            addMessageToChat({
              chatId: currentChatId,
              message: { text: aiRes.reply, isUser: false },
            })
          );
          dispatch(updateConversation(currentChatId));
          console.log("6. Success: Updated UI and saved conversation to DB.");
        } else {
          throw new Error("AI response was empty or malformed.");
        }
      } catch (e) {
        console.error("7. CATCH BLOCK: An error occurred.", e);
        dispatch(removeLastMessageFromChat(currentChatId));
        dispatch(
          addMessageToChat({
            chatId: currentChatId,
            message: { text: "Sorry, I ran into an error.", isUser: false },
          })
        );
      } finally {
        setIsAiResponding(false);
      }
    }
  };

  // ... the rest of your component

  const isLoadingMessages = status === "loading" && messages.length === 0;

  return (
    <div className="flex h-screen w-full bg-background text-foreground">
      <ChatList />
      <div className="flex flex-1 flex-col">
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="mx-auto max-w-4xl space-y-4">
            {isLoadingMessages ? (
              <div className="flex h-[70vh] items-center justify-center">
                <p>Loading conversations...</p>
              </div>
            ) : activeConversation ? (
              messages.map((msg, idx) => (
                <ChatMessage
                  key={idx}
                  isUser={msg.isUser}
                  loading={msg.loading}
                  message={msg.text}
                />
              ))
            ) : (
              <div className="flex h-[70vh] items-center justify-center">
                <Card className="w-full max-w-md">
                  <CardHeader className="text-center">
                    <CardTitle className="flex items-center justify-center gap-2 text-2xl">
                      <Bot /> Chatty
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-center text-muted-foreground">
                      Select a conversation or start a new one to begin.
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </main>
        <footer className="border-t bg-background p-4 md:p-6">
          <div className="mx-auto max-w-4xl">
            <div className="relative">
              <Input
                type="text"
                placeholder="Type your message here..."
                className="pr-16"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isAiResponding) handleSend();
                }}
                disabled={isAiResponding}
              />
              <Button
                type="submit"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2"
                onClick={handleSend}
                disabled={isAiResponding || !input.trim()}
              >
                <SendHorizonal className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default ChatPage;
