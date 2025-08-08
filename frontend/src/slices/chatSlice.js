import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  fetchConversationMessagesAPI,
  fetchConversationHeadersAPI,
  createConversationAPI,
  deleteConversationAPI,
  updateConversationAPI,
} from "../api/api";

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
  async (chatId, { getState, rejectWithValue }) => {
    try {
      const { chat } = getState();
      const conversationToUpdate = chat.conversations.find(
        (c) => c.id === chatId
      );
      if (conversationToUpdate) {
        const { heading, messages } = conversationToUpdate;
        await updateConversationAPI(chatId, { heading, messages });
        return { id: chatId, heading, messages }; // Return data for potential state update
      }
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

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
      .addCase(fetchConversationMessages.pending, (state) => {})
      .addCase(fetchConversationMessages.fulfilled, (state, action) => {
        const loadedConversation = action.payload;
        const index = state.conversations.findIndex(
          (c) => c.id === loadedConversation.id
        );
        if (index !== -1) {
          state.conversations[index] = loadedConversation;
        }
      })
      .addCase(fetchConversationMessages.rejected, (state, action) => {
        console.error("Failed to load messages:", action.payload);
      })

      // --- Creating a Conversation ---
      .addCase(createConversation.fulfilled, (state, action) => {
        state.conversations.unshift(action.payload);
        state.activeChatId = action.payload.id;
        state.status = "succeeded";
      })
      .addCase(createConversation.rejected, (state, action) => {
        state.error = action.payload?.error || "Failed to create conversation";
      })

      .addCase(deleteConversation.fulfilled, (state, action) => {
        const deletedId = action.payload;
        state.conversations = state.conversations.filter(
          (c) => c.id !== deletedId
        );
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
