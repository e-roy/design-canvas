import { create } from "zustand";
import { CanvasCursorState, UserCursor } from "@/types";

interface CursorStore {
  cursors: CanvasCursorState;
  setCursors: (cursors: CanvasCursorState) => void;
  updateCursor: (userId: string, cursor: UserCursor) => void;
  removeCursor: (userId: string) => void;
  clearCursors: () => void;
}

export const useCursorStore = create<CursorStore>((set) => ({
  cursors: {},
  setCursors: (cursors) => set({ cursors }),
  updateCursor: (userId, cursor) =>
    set((state) => ({
      cursors: {
        ...state.cursors,
        [userId]: cursor,
      },
    })),
  removeCursor: (userId) =>
    set((state) => {
      const { [userId]: removed, ...remainingCursors } = state.cursors;
      return { cursors: remainingCursors };
    }),
  clearCursors: () => set({ cursors: {} }),
}));
