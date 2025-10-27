import { ref } from "vue";
import type { Delta } from "../types/delta";

export const useHistory = (maxStack = 100) => {
  const history = ref<Delta[]>([]);
  const pointer = ref(-1);

  const save = (delta: Delta) => {
    history.value.push(JSON.parse(JSON.stringify(delta)));
    pointer.value = history.value.length - 1

    if (history.value.length > maxStack) {
      history.value.shift();
    }
  };

  const undo = (): Delta | null => {
    if (pointer.value <= 0) return null;
    pointer.value--;
    return JSON.parse(JSON.stringify(history.value[pointer.value]));
  };

  const redo = (): Delta | null => {
    if (pointer.value >= history.value.length - 1) return null;
    pointer.value++;
    return JSON.parse(JSON.stringify(history.value[pointer.value]));
  };

  const canUndo = (): boolean => pointer.value > 0;
  const canRedo = (): boolean => pointer.value < history.value.length - 1;

  return {
    save,
    undo,
    redo,
    canRedo,
    canUndo,
  };
};
