import React, { useState, useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
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

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMessage = { text: input, isUser: true };
    const userInput = input;
    setInput("");
    let currentChatId = activeChatId;

    if (!currentChatId) {
      try {
        const actionResult = await dispatch(
          createConversation({ heading: userInput, messages: [userMessage] })
        );
        if (createConversation.fulfilled.match(actionResult)) {
          currentChatId = actionResult.payload.id;
        } else return;
      } catch (e) {
        return;
      }
    } else {
      dispatch(
        addMessageToChat({ chatId: currentChatId, message: userMessage })
      );
    }

    setIsAiResponding(true);
    dispatch(
      addMessageToChat({
        chatId: currentChatId,
        message: { text: "", isUser: false, loading: true },
      })
    );

    try {
      const aiRes = await sendChatMessageToAI(userInput);
      dispatch(removeLastMessageFromChat(currentChatId));
      if (aiRes && aiRes.reply) {
        dispatch(
          addMessageToChat({
            chatId: currentChatId,
            message: { text: aiRes.reply, isUser: false },
          })
        );
        dispatch(updateConversation(currentChatId));
      } else {
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
  };

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
                className="absolute right-0 top-1/2 -translate-y-1/2"
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
