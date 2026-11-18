
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const API_URL = "http://127.0.0.1:8000/api/investigations";

export const fetchInvestigations = createAsyncThunk(
  "investigations/fetchInvestigations",
  async () => {
    const response = await axios.get(API_URL);
    return response.data;
  }
);

const investigationSlice = createSlice({
  name: "investigations",
  initialState: {
    items: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchInvestigations.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchInvestigations.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchInvestigations.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });
  },
});

export default investigationSlice.reducer;
