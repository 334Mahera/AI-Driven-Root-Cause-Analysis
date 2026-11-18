
import { createSlice } from "@reduxjs/toolkit";

const systemSlice = createSlice({
  name: "system",
  initialState: {
    backendStatus: "Checking...",
  },
  reducers: {
    setBackendStatus: (state, action) => {
      state.backendStatus = action.payload;
    },
  },
});

export const { setBackendStatus } = systemSlice.actions;

export default systemSlice.reducer;
