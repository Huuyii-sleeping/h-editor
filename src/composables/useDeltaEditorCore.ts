import { ref, watch, type Ref } from "vue";
import type { Delta, DeltaAttributes } from "../types/delta";
import { deltaToHTML } from "./useDeltaRender";
import { htmlToDelta } from "./useDeltaFromHTML";
import { useSelection } from "./useSelection";
import { useHistory } from "./useHistory";

export const useDeltaEditorCore = (
  editorElRef: Ref<HTMLDivElement | null>,
  selectionManager?: ReturnType<typeof useSelection>
) => {
  const delta = ref<Delta>([{ insert: "欢迎使用 Delta 编辑器" }]);
  let lastHTML = deltaToHTML(delta.value);
  let isRendering = false;
  let undoing = false;
  let redoing = false;
  const internalSelection = selectionManager || useSelection(editorElRef);
  const { savedSelection, restoreSelection } = internalSelection;
  const history = useHistory();
  history.save(delta.value);

  watch(
    delta,
    (newDelta) => {
      if (undoing) {
        undoing = false;
        return;
      }
      if (redoing) {
        redoing = false;
        return;
      }
      history.save(newDelta);
    },
    { deep: true }
  );

  const undo = () => {
    undoing = true;
    const prev = history.undo();
    if (prev) {
      delta.value = prev;
      renderToDOM();
    }
  };

  const redo = () => {
    redoing = true;
    const next = history.redo();
    if (next) {
      delta.value = next;
      renderToDOM();
    }
  };

  const renderToDOM = (): void => {
    if (!editorElRef.value) return;
    const deltaRange = internalSelection.getSelectedDeltaRange();
    isRendering = true;
    editorElRef.value.innerHTML = deltaToHTML(delta.value);
    lastHTML = editorElRef.value.innerHTML;
    isRendering = false;
    if (deltaRange) {
      internalSelection.setSelectionByDeltaPosition(
        deltaRange.start,
        deltaRange.end
      );
    }
  };

  const getText = (): string => {
    return delta.value
      .filter((op) => "insert" in op)
      .map((op) => op.insert)
      .join("");
  };

  const handleInput = (): void => {
    if (!editorElRef.value || isRendering) return;

    const currentHTML = editorElRef.value.innerHTML;
    if (currentHTML === lastHTML) return;
    try {
      savedSelection();
      let newDelta = htmlToDelta(currentHTML);
      newDelta = newDelta.filter((op: any) => {
        if (
          "insert" in op &&
          op.insert === "\u200B" &&
          op.attributes?.__tempBreak
        ) {
          return false;
        }
        return true;
      });
      delta.value = newDelta;
      lastHTML = currentHTML;
      restoreSelection();
    } catch (error) {
      console.error("Failed to parse HTML to Delta", error);
      editorElRef.value.innerHTML = lastHTML;
      restoreSelection();
    }
  };

  const insertText = (
    // index: number,
    text: string,
    attributes?: DeltaAttributes
  ): void => {
    // 指定位置插入文本，简化版直接插入末尾
    delta.value.push({ insert: text, attributes });
  };

  const formatRange = (
    startIndex: number,
    endIndex: number,
    format: keyof DeltaAttributes,
    value: string | number | boolean
  ): void => {
    const newDelta: Delta = [];
    let pos = 0;

    for (const op of delta.value) {
      if (!("insert" in op) || typeof op.insert !== "string") {
        // 只处理字符串类型的insert
        newDelta.push(op);
        continue;
      }

      const opText = op.insert;
      const opStart = pos;
      const opEnd = pos + opText.length;

      // 1. 完全不重叠的节点，直接保留
      if (opEnd <= startIndex || opStart >= endIndex) {
        newDelta.push(op);
        pos = opEnd;
        continue;
      }

      // 2. 计算重叠区间并拆分文本
      const overlapStart = Math.max(opStart, startIndex);
      const overlapEnd = Math.min(opEnd, endIndex);
      const beforeText = opText.slice(0, overlapStart - opStart);
      const overlapText = opText.slice(
        overlapStart - opStart,
        overlapEnd - opStart
      );
      const afterText = opText.slice(overlapEnd - opStart);

      if (beforeText) {
        newDelta.push({
          insert: beforeText,
          attributes: op.attributes,
        });
      }

      if (overlapText) {
        const newAttts = { ...op.attributes } as any;
        if (newAttts?.__tempBreak) {
          delete newAttts.__tempBreak;
        }

        if (value === false) {
          delete newAttts[format];
        } else {
          newAttts[format] = value;
        }

        newDelta.push({
          insert: overlapText,
          attributes: Object.keys(newAttts).length > 0 ? newAttts : undefined,
        });
      }

      if (afterText) {
        newDelta.push({
          insert: afterText,
          attributes: op.attributes,
        });
      }

      pos = opEnd;
    }

    delta.value = newDelta;
  };

  const insertStyleBreak = () => {
    const newDelta = [...delta.value];
    const text = getText();
    const lastVisibleIndex = text.endsWith("\n")
      ? text.length - 1
      : text.length;
    let insertPos = newDelta.length;
    let currentLength = 0;

    for (let i = 0; i < newDelta.length; i++) {
      const op = newDelta[i];
      if (!op) continue;
      if ("insert" in op && typeof op.insert === "string") {
        currentLength += op.insert.length;
        if (currentLength >= lastVisibleIndex) {
          insertPos = i + 1;
          break;
        }
      }
    }

    newDelta.splice(insertPos, 0, {
      insert: "\u200B",
      attributes: { __tempBreak: true } as DeltaAttributes,
    });
    delta.value = newDelta;
  };

  return {
    delta,
    renderToDOM,
    getText,
    insertText,
    formatRange,
    handleInput,
    undo,
    redo,
    canUndo: history.canUndo,
    canRedo: history.canRedo,
    insertStyleBreak,
  };
};
