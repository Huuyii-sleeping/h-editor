import type { Delta, DeltaAttributes } from "../types/delta";

const applyAttributes = (text: string, attrs: DeltaAttributes): Node => {
  if (attrs.header) {
    const el = document.createElement(`h${attrs.header}`);
    el.textContent = text;
    return el;
  }
  if (attrs.link) {
    const a = document.createElement("a");
    a.href = attrs.link;
    a.textContent = text;
    a.target = "_blank";
    return a;
  }

  const span = document.createElement("span");
  span.textContent = text;
  if (attrs.bold) span.style.fontWeight = "bold";
  if (attrs.italic) span.style.fontStyle = "italic";
  if (attrs.underline) span.style.textDecoration = "underline";
  if (attrs.strike)
    span.style.textDecoration = (
      span.style.textDecoration + "line-through"
    ).trim();
  if (attrs.color) span.style.color = attrs.color;
  if (attrs.background) span.style.backgroundColor = attrs.background;

  return span;
  // TODO: 列表需要进行特殊处理
};

export const deltaToHTML = (delta: Delta): string => {
  const container = document.createElement("div");

  for (const op of delta) {
    if ("insert" in op) {
      const text = op.insert;
      if (text === "\n") {
        container.appendChild(document.createElement("br"));
        continue;
      }

      const node = op.attributes
        ? applyAttributes(text, op.attributes)
        : document.createTextNode(text);
      container.appendChild(node);
    }
    // TODO：处理 delete和retain
  }
  return container.innerHTML;
};
