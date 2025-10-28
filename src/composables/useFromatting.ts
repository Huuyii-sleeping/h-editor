import type { Ref } from "vue";
import { useSelection } from "./useSelection";
import type { DeltaAttributes } from "../types/delta";

export const useFormatting = (
  editorElRef: Ref<HTMLDivElement | null>,
  core: {
    delta: Ref<import("../types/delta").Delta>;
    getText: () => string;
    formatRange: (
      start: number,
      end: number,
      format: keyof DeltaAttributes,
      value: boolean | number | string
    ) => void;
    renderToDOM: () => void;
  }
) => {
  const selection = useSelection(editorElRef);

  const isFormatActive = (format: keyof DeltaAttributes): boolean => {
    const range = selection.getSelectedDeltaRange();
    if (!range || range.start === range.end || core.delta.value.length === 0) {
      return false;
    }
    const { start, end } = range;
    let pos = 0;
    for (const op of core.delta.value) {
      if (!("insert" in op)) continue;

      const opText = op.insert;
      const opLength = opText.length;
      const opStart = pos;
      const opEnd = pos + opLength;

      if (opEnd > start && opStart < end) {
        if (format === "list") {
          return getCurrentListType() !== null;
        }
        if (
          format === "header" ||
          format === "color" ||
          format == "background"
        ) {
          return op.attributes?.[format] !== undefined;
        } else {
          return op.attributes?.[format] === true;
        }
      }
      pos += opLength;
    }
    return false;
  };

  const applyFormat = (
    format: keyof DeltaAttributes,
    value: boolean | number | string = true
  ) => {
    if (!editorElRef.value) return;
    selection.savedSelection();
    const deltaRange = selection.getSelectedDeltaRange();
    if (!deltaRange || deltaRange.start === deltaRange.end) {
      return;
    }
    const { start, end } = deltaRange;
    core.formatRange(start, end, format, value);
    core.renderToDOM();
    selection.setSelectionByDeltaPosition(start, end);
  };

  const getCurrentListType = (): "bullet" | "ordered" | null => {
    const range = selection.getSelectedDeltaRange();
    if (!range || range.start === range.end || core.delta.value.length === 0) {
      return null;
    }
    const { start, end } = range;
    let pos = 0;
    for (const op of core.delta.value) {
      if (!("insert" in op)) continue;
      const opText = op.insert;
      const opLength = opText.length;
      const opStart = pos;
      const opEnd = pos + opLength;
      if (opEnd > start && opStart < end) {
        if (op.attributes?.list) {
          return op.attributes.list;
        }
      }
      pos += opLength;
    }
    return null;
  };

  const toggleList = (type: "bullet" | "ordered") => {
    const current = getCurrentListType();
    if (current === type) {
      applyFormat("list", false);
    } else {
      applyFormat("link", type);
    }
  };

  return {
    isFormatActive,
    applyFormat,
    getCurrentListType,
    toggleList,
  };
};
