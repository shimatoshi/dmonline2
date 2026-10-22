import { createContext } from "react";

// 盤面の複数選択: 選んだ順の [{ zone, index }]
export const MultiSelectContext = createContext({ picked: [] });
