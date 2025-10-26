import type { Delta, DeltaAttributes } from "../types/delta";

const applyAttributes = (el: HTMLElement, attrs: DeltaAttributes): void => {
  if (attrs.bold) el.style.fontWeight = "bold";
  if (attrs.italic) el.style.fontStyle = "italic";
  if (attrs.underline) el.style.textDecoration = "underline";

  if (attrs.header) {
    const heading = document.createElement(`h${attrs.header}`);
    heading.innerHTML = el.innerHTML;
    el.replaceWith(heading);
  }

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

      const span = document.createElement("span");
      span.textContent = text;
      if (op.attributes) {
        applyAttributes(span, op.attributes);
      }
      container.appendChild(span);
    }
    // TODO：处理 delete和retain
  }
  return container.innerHTML  
};


