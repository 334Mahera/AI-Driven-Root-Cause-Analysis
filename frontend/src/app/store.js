import { configureStore } from "@reduxjs/toolkit";
import systemReducer from "../features/system/systemSlice";
import investigationReducer from "../features/investigation/investigationSlice";

export const store = configureStore({
  reducer: {
    system: systemReducer,
    investigations: investigationReducer,
  },
});