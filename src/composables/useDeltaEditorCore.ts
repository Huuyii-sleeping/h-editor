import { ref, type Ref } from "vue";
import type { Delta, DeltaAttributes } from "../types/delta";
import { deltaToHTML } from "./useDeltaRender";
import { htmlToDelta } from "./useDeltaFromHTML";

export const useDeltaEditorCore = (editorElRef: Ref<HTMLDivElement | null>) => {
  const delta = ref<Delta>([{ insert: "欢迎使用 Delta 编辑器\n" }]);
  let lastHTML = deltaToHTML(delta.value);
  let isRendering = false;

  const renderToDOM = (): void => {
    if (!editorElRef.value) return;
    isRendering = true;
    editorElRef.value.innerHTML = deltaToHTML(delta.value);
    lastHTML = editorElRef.value.innerHTML;
    isRendering = false;
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
      const newDalta = htmlToDelta(currentHTML);

      delta.value = newDalta;
      lastHTML = currentHTML;
    } catch (error) {
      console.error("Failed to parse HTML to Delta", error);
      editorElRef.value.innerHTML = lastHTML;
    }
  };

  const insertText = (
    index: number,
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
    value: boolean | number
  ): void => {
    // 简化：重建delta
    // 真实情况下需要遍历ops， 拆分，合并区间
    // const text = getText();
    const newDelta: Delta = [];
    let pos = 0;

    for (const op of delta.value) {
      if (!("insert" in op)) continue;
      // TODO delete retain 操作
      const opText = op.insert;
      const opStart = pos;
      const opEnd = pos + opText.length;

      if (opEnd <= startIndex || opStart >= endIndex) {
        newDelta.push(op);
      } else {
        const before = opStart < startIndex ? startIndex - opStart : 0;
        const after = opEnd > endIndex ? opEnd - endIndex : 0;
        const middle = opText.length - before - after;

        if (before > 0) {
          newDelta.push({
            insert: opText.substring(0, before),
            attributes: op.attributes,
          });
        }

        if (middle > 0) {
          const newAttrs = { ...op.attributes, [format]: value };
          if (value === false) {
            delete newAttrs[format];
            if (Object.keys(newAttrs).length === 0) {
              newDelta.push({
                insert: opText.substring(before, before + middle),
              });
            } else {
              newDelta.push({
                insert: opText.substring(before, before + middle),
                attributes: newAttrs,
              });
            }
          } else {
            newDelta.push({
              insert: opText.substring(before, before + middle),
              attributes: newAttrs,
            });
          }
        }

        if (after > 0) {
          newDelta.push({
            insert: opText.substring(opText.length - after),
            attributes: op.attributes,
          });
        }
      }
      pos += opText.length;
    }
    delta.value = newDelta;
  };

  return {
    delta,
    renderToDOM,
    getText,
    insertText,
    formatRange,
    handleInput,
  };
};
