import type { Ref } from "vue";

// dfs 遍历所有的文本节点
function getTextNodes(element: Node): Text[] {
  const textNodes: Text[] = [];
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null);
  let node: Text | null;
  while ((node = walker.nextNode() as Text | null)) {
    const text = node.textContent || "";
    if (text || text.includes("\u200B")) {
      textNodes.push(node);
    }
  }
  return textNodes;
}

// 过滤文本中的零宽空格（仅用于计算，不影响原始文本）
const removeZeroWidth = (text: string): string => text.replace(/\u200B/g, "");

// 计算原始偏移在过滤零宽字符后的文本中的位置
const mapRawOffsetToClean = (rawText: string, rawOffset: number): number => {
  let cleanOffset = 0;
  for (let i = 0; i < Math.min(rawOffset, rawText.length); i++) {
    if (rawText[i] !== "\u200B") {
      cleanOffset++;
    }
  }
  return cleanOffset;
};

// 计算过滤零宽字符后的偏移在原始文本中的位置
const mapCleanOffsetToRaw = (rawText: string, cleanOffset: number): number => {
  let remaining = cleanOffset;
  let rawOffset = 0;
  for (; rawOffset < rawText.length; rawOffset++) {
    if (rawText[rawOffset] !== "\u200B") {
      remaining--;
      if (remaining < 0) break;
    }
  }
  return rawOffset;
};
/**
 * 将dom选区当中（range对象）转换成基于文本内容的的起始和结束偏移量（相对于整个编辑器的位置）
 * 简单的说，就是计算用户在编辑器中选中的文本在整个文本中起始和结束位置
 * @param range
 * @param editorEl
 * @returns
 */
export function rangeToDeltaPostion(
  range: Range,
  editorEl: HTMLElement
): { start: number; end: number } | null {
  const textNodes = getTextNodes(editorEl);
  if (textNodes.length === 0) return null;

  let totalCleanOffset = 0; // 累计过滤零宽字符后的偏移量
  let start: number | null = null;
  let end: number | null = null;

  for (const node of textNodes) {
    const rawText = node.textContent || "";
    const cleanText = removeZeroWidth(rawText); // 过滤零宽字符
    const cleanLength = cleanText.length;

    const nodeCleanStart = totalCleanOffset;
    const nodeCleanEnd = totalCleanOffset + cleanLength;

    // 处理起始位置
    if (start === null) {
      if (range.startContainer === node) {
        // 原始偏移 → 过滤后的偏移
        const cleanOffset = mapRawOffsetToClean(rawText, range.startOffset);
        start = nodeCleanStart + cleanOffset;
      } else if (
        range.startContainer === node.parentElement &&
        Array.from(node.parentElement.childNodes).indexOf(node) >=
          range.startOffset
      ) {
        start = nodeCleanStart; // 光标在当前节点前
      }
    }

    // 处理结束位置
    if (end === null) {
      if (range.endContainer === node) {
        // 原始偏移 → 过滤后的偏移
        const cleanOffset = mapRawOffsetToClean(rawText, range.endOffset);
        end = nodeCleanStart + cleanOffset;
      } else if (
        range.endContainer === node.parentElement &&
        Array.from(node.parentElement.childNodes).indexOf(node) >=
          range.endOffset
      ) {
        end = nodeCleanStart; // 光标在当前节点前
      }
    }

    if (start !== null && end !== null) break;
    totalCleanOffset = nodeCleanEnd; // 累加过滤后的长度
  }

  // 兜底：确保位置在有效范围内
  if (start === null) start = totalCleanOffset;
  if (end === null) end = totalCleanOffset;
  return { start, end };
}

/**
 * 将delta文本索引转化成DOM range
 * @param position
 * @param editorEl
 * @returns
 */
export function deltaPositionToRange(
  position: number,
  editorEl: HTMLElement
): Range | null {
  const textNodes = getTextNodes(editorEl);
  let totalCleanOffset = 0; // 累计过滤零宽字符后的偏移量

  for (const node of textNodes) {
    const rawText = node.textContent || "";
    const cleanText = removeZeroWidth(rawText);
    const cleanLength = cleanText.length;

    const nodeCleanEnd = totalCleanOffset + cleanLength;

    if (position <= nodeCleanEnd) {
      // 过滤后的偏移 → 原始文本中的偏移
      const cleanOffsetInNode = Math.max(0, position - totalCleanOffset);
      const rawOffsetInNode = mapCleanOffsetToRaw(rawText, cleanOffsetInNode);

      const range = document.createRange();
      range.setStart(node, rawOffsetInNode);
      range.setEnd(node, rawOffsetInNode);
      return range;
    }

    totalCleanOffset = nodeCleanEnd;
  }

  // 光标在末尾（处理最后一个节点）
  if (textNodes.length > 0) {
    const lastNode = textNodes[textNodes.length - 1];
    // const rawText = lastNode!.textContent || "";
    const range = document.createRange();
    range.setStartAfter(lastNode as Node); // 放在最后一个节点后面
    range.setEndAfter(lastNode as Node);
    return range;
  }
  return null;
}

export function useSelection(editorRef: Ref<HTMLElement | null>) {
  let savedRange: Range | null = null;
  let savedDeltaRange: { start: number; end: number } | null = null;

  /**
   * 保存当前选区的位置
   */
  const savedSelection = (): void => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !editorRef.value) return;

    const range = selection.getRangeAt(0).cloneRange();
    savedRange = range;
    const deltaPos = rangeToDeltaPostion(range, editorRef.value);
    savedDeltaRange = deltaPos;
  };

  //   回复之前的选区
  const restoreSelection = (): boolean => {
    if (!savedDeltaRange || !editorRef.value) return false;
    const selection = window.getSelection();
    if (!selection) return false;

    try {
      selection.removeAllRanges();
      selection.addRange(savedRange as Range);
      return true;
    } catch (error) {
      console.warn("fail to restore selection", error);
      return false;
    }
  };

  const clearSelection = (): void => {
    savedDeltaRange = null;
  };

  // 当前选区在文本中的位置
  const getSelectedDeltaRange = (): { start: number; end: number } | null => {
    const selection = window.getSelection()
    if(!selection || !editorRef.value || selection.rangeCount === 0){
      return savedDeltaRange
    }
    const range = selection.getRangeAt(0);
    return rangeToDeltaPostion(range, editorRef.value);
  };

  //   将Delta位置设为当前选区
  const setSelectionByDeltaPosition = (
    start: number,
    end: number = start
  ): boolean => {
    if (!editorRef.value) return false;
    const startRange = deltaPositionToRange(start, editorRef.value);
    const endRange = deltaPositionToRange(end, editorRef.value);

    if (!startRange || !endRange) return false;
    const selection = window.getSelection();
    if (!selection) return false;
    const newRange = document.createRange();
    newRange.setStart(startRange.startContainer, startRange.startOffset);
    newRange.setEnd(endRange.endContainer, endRange.endOffset);

    selection.removeAllRanges();
    selection.addRange(newRange);
    savedDeltaRange = { start, end };
    return true;
  };

  return {
    savedSelection,
    restoreSelection,
    clearSelection,
    getSelectedDeltaRange,
    setSelectionByDeltaPosition,
  };
}
