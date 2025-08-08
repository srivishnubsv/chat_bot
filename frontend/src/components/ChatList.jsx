import React from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "../hooks/useAuth";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  setActiveChatId,
  deleteConversation,
  clearChatState,
} from "../slices/chatSlice";
import { cn } from "@/lib/utils";
import { PlusCircle, Trash2, LogOut } from "lucide-react";

const ChatList = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { logout } = useAuth();
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
    logout();
    navigate("/login");
  };

  return (
    <div className="hidden h-screen w-80 flex-col border-r bg-muted/40 md:flex">
      {/* Header */}
      <div className="flex h-[60px] items-center border-b px-6">
        <h1 className="text-lg font-semibold">Chatty</h1>
      </div>

      {/* Main Section */}
      <div className="flex flex-1 flex-col gap-4 py-4">
        {/* New Chat Button */}
        <div className="px-4">
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleNewChat}
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  New Chat
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Start a new conversation</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto px-4">
          <nav className="grid items-start text-sm font-medium">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className="group relative flex items-center rounded-md hover:bg-muted/60 transition-colors"
              >
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        className={cn(
                          "w-full justify-start overflow-hidden text-left",
                          "whitespace-nowrap truncate px-3",
                          conv.id === activeChatId &&
                            "bg-muted font-bold shadow-inner"
                        )}
                        onClick={() => dispatch(setActiveChatId(conv.id))}
                      >
                        {conv.heading}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p>{conv.heading}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                {/* Delete Button on Hover */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 h-7 w-7 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity"
                  onClick={(e) => handleDelete(e, conv.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </nav>
        </div>
      </div>

      {/* Logout Button */}
      <div className="mt-auto border-t p-4">
        <Button variant="destructive" className="w-full" onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
    </div>
  );
};

export default ChatList;
