import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
// Import the new API functions that use the authenticated interceptor
import {
  fetchConversationMessagesAPI,
  fetchConversationHeadersAPI,
  createConversationAPI,
  deleteConversationAPI,
  updateConversationAPI,
} from "../api/api";

// --- ASYNC THUNKS ---
// These handle all communication with your backend.

/**
 * Fetches all conversations for the logged-in user.
 * No arguments are needed because the user is identified by the JWT token.
 */
export const fetchConversationHeaders = createAsyncThunk(
  "chat/fetchConversationHeaders",
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetchConversationHeadersAPI();
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);
export const fetchConversationMessages = createAsyncThunk(
  "chat/fetchConversationMessages",
  async (chatId, { rejectWithValue }) => {
    try {
      const response = await fetchConversationMessagesAPI(chatId);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

/**
 * Creates a new conversation on the backend.
 * It takes the initial conversation data (heading and messages).
 */
export const createConversation = createAsyncThunk(
  "chat/createConversation",
  async (conversationData, { rejectWithValue }) => {
    try {
      const response = await createConversationAPI(conversationData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

/**
 * Deletes a conversation by its ID.
 */
export const deleteConversation = createAsyncThunk(
  "chat/deleteConversation",
  async (chatId, { rejectWithValue }) => {
    try {
      await deleteConversationAPI(chatId);
      return chatId; // Return the ID for removal from state
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);
export const updateConversation = createAsyncThunk(
  "chat/updateConversation",
  // The thunk gets the chatId and accesses the Redux state to find the full conversation
  async (chatId, { getState, rejectWithValue }) => {
    try {
      const { chat } = getState();
      const conversationToUpdate = chat.conversations.find(
        (c) => c.id === chatId
      );
      if (conversationToUpdate) {
        // We only need to send the parts that can change: heading and messages
        const { heading, messages } = conversationToUpdate;
        await updateConversationAPI(chatId, { heading, messages });
        return { id: chatId, heading, messages }; // Return data for potential state update
      }
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

// --- SLICE DEFINITION ---

const initialState = {
  conversations: [],
  activeChatId: null,
  status: "idle", // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
};

const chatSlice = createSlice({
  name: "chat",
  initialState,
  // Synchronous reducers for immediate UI updates
  reducers: {
    setActiveChatId: (state, action) => {
      state.activeChatId = action.payload;
    },
    // Useful for optimistically adding a user's message to the UI
    // before the AI response is received.
    addMessageToChat: (state, action) => {
      const { chatId, message } = action.payload;
      const conversation = state.conversations.find((c) => c.id === chatId);
      if (conversation) {
        conversation.messages.push(message);
      }
    },
    // Used to remove the "loading..." message before adding the real AI response.
    removeLastMessageFromChat: (state, action) => {
      const chatId = action.payload;
      const conversation = state.conversations.find((c) => c.id === chatId);
      if (conversation) {
        conversation.messages.pop();
      }
    },
    clearChatState: (state) => {
      state.conversations = [];
      state.activeChatId = null;
      state.status = "idle";
      state.error = null;
    },
  },
  // Asynchronous reducers that respond to the thunks
  extraReducers: (builder) => {
    builder
      // --- Fetching Conversations ---
      .addCase(fetchConversationHeaders.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchConversationHeaders.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.conversations = action.payload; // This is now a list of headers
        const activeExists = action.payload.some(
          (c) => c.id === state.activeChatId
        );
        if (!activeExists && action.payload.length > 0) {
          state.activeChatId = action.payload[0].id;
        }
      })
      .addCase(fetchConversationHeaders.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload?.error || "Failed to fetch conversations";
      })
      // --- Fetching MESSAGES for a single conversation ---
      .addCase(fetchConversationMessages.pending, (state) => {
        // Optional: you could set a loading state for the specific chat here
      })
      .addCase(fetchConversationMessages.fulfilled, (state, action) => {
        const loadedConversation = action.payload;
        const index = state.conversations.findIndex(
          (c) => c.id === loadedConversation.id
        );
        if (index !== -1) {
          // Replace the partial header object with the full conversation object
          state.conversations[index] = loadedConversation;
        }
      })
      .addCase(fetchConversationMessages.rejected, (state, action) => {
        // Optional: handle error for a single chat load
        console.error("Failed to load messages:", action.payload);
      })

      // --- Creating a Conversation ---
      .addCase(createConversation.fulfilled, (state, action) => {
        // Add the new conversation to the top of the list for better UX
        state.conversations.unshift(action.payload);
        // Automatically make the new conversation active
        state.activeChatId = action.payload.id;
        state.status = "succeeded";
      })
      .addCase(createConversation.rejected, (state, action) => {
        state.error = action.payload?.error || "Failed to create conversation";
      })

      // --- Deleting a Conversation ---
      .addCase(deleteConversation.fulfilled, (state, action) => {
        const deletedId = action.payload;
        state.conversations = state.conversations.filter(
          (c) => c.id !== deletedId
        );
        // If the deleted chat was the active one, pick a new active chat
        if (state.activeChatId === deletedId) {
          state.activeChatId =
            state.conversations.length > 0 ? state.conversations[0].id : null;
        }
      })
      .addCase(deleteConversation.rejected, (state, action) => {
        state.error = action.payload?.error || "Failed to delete conversation";
      });
  },
});

export const {
  setActiveChatId,
  addMessageToChat,
  removeLastMessageFromChat,
  clearChatState,
} = chatSlice.actions;

export default chatSlice.reducer;
