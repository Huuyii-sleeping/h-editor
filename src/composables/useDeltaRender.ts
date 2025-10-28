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
  let currentList: { type: "ul" | "ol"; element: HTMLElement } | null = null;

  for (const op of delta) {
    if ("insert" in op) {
      const text = op.insert;
      if (text === "\n") {
        if (currentList) {
          container.appendChild((currentList as any).element);
          currentList = null;
        }
        container.appendChild(document.createElement("br"));
        continue;
      }

      const isListItem = op.attributes?.list;
      const shouldCloseList =
        currentList &&
        (!isListItem ||
          (isListItem === "bullet" && (currentList as any).type !== "ul") ||
          (isListItem === "ordered" && (currentList as any).type !== "ol"));

      if (shouldCloseList) {
        container.appendChild((currentList as any)?.element);
        currentList = null;
      }
      if (isListItem) {
        if (!currentList) {
          currentList = {
            type: isListItem === "bullet" ? "ul" : "ol",
            element: document.createElement(
              isListItem === "bullet" ? "ul" : "ol"
            ),
          };
        }
        const li = document.createElement("li");
        const node =
          op.attributes && Object.keys(op.attributes).length > 1
            ? applyAttributes(text, { ...op.attributes, list: undefined })
            : document.createTextNode(text);
        li.appendChild(node);
        currentList.element.appendChild(li);
      } else {
        if (currentList) {
          container.appendChild(currentList.element);
          currentList = null;
        }
        const node = op.attributes
          ? applyAttributes(text, op.attributes)
          : document.createTextNode(text);
        container.appendChild(node);
      }
    }
  }
  if (currentList) {
    container.appendChild(currentList.element);
  }
  return container.innerHTML;
};
