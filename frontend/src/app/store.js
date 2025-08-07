import { configureStore } from "@reduxjs/toolkit";

// Import the reducer from your chat slice file
import chatReducer from "../slices/chatSlice";

export const store = configureStore({
  // The 'reducer' object is where you combine all the different state slices
  // from your application.
  reducer: {
    // The key 'chat' will be how you access this state in your components
    // (e.g., state.chat). The value is the reducer function that manages it.
    chat: chatReducer,

    // If you add more features later (e.g., an auth slice),
    // you would import and add their reducers here:
    // auth: authReducer,
  },
});
