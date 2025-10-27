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

  let totalOffset = 0;
  let start: number | null = null;
  let end: number | null = null;

  for (const node of textNodes) {
    const nodeLength = node.textContent?.length || 0;
    const nodeStart = totalOffset;
    const nodeEnd = totalOffset + nodeLength;

    if (start === null) {
      if (range.startContainer === node) {
        start = nodeStart + Math.min(range.startOffset, nodeLength);
      } else if (
        range.startContainer === node.parentElement &&
        Array.from(node.parentElement.childNodes).indexOf(node) >=
          range.startOffset
      ) {
        // 简单的说就是选择了儿子节点，父节点不相同的情况
        start = nodeStart;
      }
    }

    if (end === null) {
      if (range.endContainer === node) {
        end = nodeStart + Math.min(range.endOffset, nodeLength);
      } else if (
        range.endContainer === node.parentElement &&
        Array.from(node.parentElement.childNodes).indexOf(node) >=
          range.endOffset
      ) {
        end = nodeStart;
      }
    }

    if (start !== null && end !== null) break;
    totalOffset = nodeEnd;
  }

  if (start === null) start = totalOffset;
  if (end === null) end = totalOffset;
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
  let totalOffset = 0;

  for (const node of textNodes) {
    const nodeLength = node.textContent?.length || 0;
    const nodeEnd = totalOffset + nodeLength;

    if (position <= nodeEnd) {
      const offsetInNode = Math.max(0, position - totalOffset);
      const range = document.createRange();
      range.setStart(node, offsetInNode);
      range.setEnd(node, offsetInNode);
      return range;
    }
    totalOffset += nodeLength;
  }

  if (textNodes.length > 0) {
    const lastNode = textNodes[textNodes.length - 1];
    const range = document.createRange();
    range.setStart(lastNode as Node, lastNode?.textContent?.length || 0);
    range.setEnd(lastNode as Node, lastNode?.textContent?.length || 0);
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

  // 当前选区在文本中的位置
  const getSelectedDeltaRange = (): { start: number; end: number } | null => {
    if (savedDeltaRange) {
      return savedDeltaRange;
    }

    const selection = window.getSelection();
    if (!selection || !editorRef.value || selection.rangeCount === 0)
      return null;
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
    getSelectedDeltaRange,
    setSelectionByDeltaPosition,
  };
}
