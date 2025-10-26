import type { Delta, DeltaAttributes } from "../types/delta";

const getAttributesFromElement = (el: HTMLElement): DeltaAttributes => {
  const attrs: DeltaAttributes = {};
  if (el.tagName === "STRONG" || el.style.fontWeight === "bold") {
    attrs.bold = true;
  }
  if (el.tagName === "EM" || el.style.fontStyle === "italic") {
    attrs.italic = true;
  }
  if (el.style.textDecoration?.includes("underline")) {
    attrs.underline = true;
  }

  if (el.tagName === "H1") attrs.header = 1;
  if (el.tagName === "H2") attrs.header = 2;

  // TODO 列表，链接等

  return attrs;
};

const walkDOM = (
  node: Node,
  delta: Delta,
  parentAttrs: DeltaAttributes = {}
): void => {
  if (node.nodeType === node.TEXT_NODE) {
    const text = node.textContent || "";
    if (text) {
      delta.push({
        insert: text,
        attributes:
          Object.keys(parentAttrs).length > 0 ? parentAttrs : undefined,
      });
    }
    return;
  }

  if (node.nodeType === Node.ELEMENT_NODE) {
    const el = node as HTMLElement;
    const currentAttrs = { ...parentAttrs, ...getAttributesFromElement(el) };
    const isBlock = ["H1", "H2", "P", "DIV", "UL", "OL", "LI"].includes(
      el.tagName
    );
    const children = Array.from(el.childNodes);

    for (let i = 0; i < children.length; i++) {
      walkDOM(children[i] as Node, delta, currentAttrs);
    }

    // 块级元素做出特殊的处理
    if (
      isBlock &&
      delta.length > 0 &&
      (delta[delta.length - 1] as any).insert.endsWith("\n")
    ) {
      delta.push({ insert: "\n" });
    }
  }
};

export const htmlToDelta = (html: string): Delta => {
  const wrapper = document.createElement("div");
  wrapper.innerHTML = html;
  const delta: Delta = [];
  walkDOM(wrapper, delta);
  const merged: Delta = [];
  //   优化：进行样式的合并
  for (const op of delta) {
    if (
      merged.length > 0 &&
      "insert" in op &&
      "insert" in (merged as any)[merged.length - 1] &&
      JSON.stringify(op.attributes) ===
        JSON.stringify((merged as any)[merged.length - 1].attributes)
    ) {
      (merged as any)[merged.length - 1].insert += op.insert;
    } else {
      merged.push(op);
    }
  }
  return merged;
};
