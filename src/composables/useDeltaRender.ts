import type { Delta, DeltaAttributes, InsertOp } from "../types/delta";

const applyAttributes = (text: string, attrs: DeltaAttributes): HTMLElement => {
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
  if (attrs.list) {
    span.style.display = "list-item";
    span.style.marginLeft = "20px";
    if (attrs.list === "bullet") {
      span.style.listStyleType = "disc";
    } else if (attrs.list === "ordered") {
      span.style.listStyleType = "decimal";
    }
  }
  if (attrs.italic) span.style.fontStyle = "italic";
  if (attrs.underline) span.style.textDecoration = "underline";
  if (attrs.strike)
    span.style.textDecoration = (
      span.style.textDecoration + "line-through"
    ).trim();
  if (attrs.color) span.style.color = attrs.color;
  if (attrs.background) span.style.backgroundColor = attrs.background;
  if (attrs.indent && attrs.indent > 0) {
    span.style.marginLeft = `${attrs.indent * 20}px`;
  }

  return span;
};

export const deltaToHTML = (delta: Delta): string => {
  const container = document.createElement("div");
  let currentParagraph: HTMLElement | null = null;
  let currentList: { type: "ul" | "ol"; element: HTMLElement } | null = null;
  let prevElement: HTMLElement | null = null;

  const flushParagraph = () => {
    if (currentParagraph) {
      container.appendChild(currentParagraph);
      currentParagraph = null;
    }
  };

  const flushList = () => {
    if (currentList) {
      container.appendChild(currentList.element);
      currentList = null;
    }
  };

  const createParagraph = () => {
    currentParagraph = document.createElement("div");
  };

  const createList = (type: "bullet" | "ordered") => {
    const listElement = document.createElement(type === "bullet" ? "ul" : "ol");
    currentList = {
      type: type === "bullet" ? "ul" : "ol",
      element: listElement,
    };
  };

  const handleParagraph = (op: any) => {
    let text = op.insert;
    let attributes = op.attributes || {};
    let findEnterIndex = text.indexOf("\n");
    if (findEnterIndex === -1) {
      prevElement = attributes
        ? applyAttributes(text, { ...attributes })
        : (() => {
            const span = document.createElement("span");
            span.textContent = text;
            return span;
          })();
      if (!prevElement.textContent) prevElement.textContent = " ";
      if (!currentParagraph) createParagraph();
      currentParagraph?.appendChild(prevElement as HTMLElement);
    } else {
      while (findEnterIndex !== -1) {
        const storeText = text.slice(0, findEnterIndex);
        const node = attributes
          ? applyAttributes(storeText, { ...attributes })
          : (() => {
              const span = document.createElement("span");
              span.textContent = storeText;
              return span;
            })();
        if (!node.textContent) node.textContent = "";
        if (!currentParagraph) createParagraph();
        currentParagraph?.appendChild(node);
        const br = document.createElement("br");
        currentParagraph?.appendChild(br);
        flushParagraph();
        text = text.slice(findEnterIndex + 1);
        findEnterIndex = text.indexOf("\n");
      }
      prevElement = attributes
        ? applyAttributes(text, { ...attributes })
        : (() => {
            const span = document.createElement("span");
            span.textContent = text;
            return span;
          })();
      if (!prevElement.textContent) prevElement.textContent = " ";
      if (!currentParagraph) createParagraph();
      currentParagraph?.appendChild(prevElement as HTMLElement);
    }
  };

  const handleList = (op: InsertOp) => {
    let text = op.insert;
    let attributes = op.attributes || {};
    let listType = attributes.list;
    if (!listType) return;

    const targetListType = listType === "bullet" ? "ul" : "ol";
    if (!currentList || currentList.type !== targetListType) {
      flushList();
      createList(listType);
    }
    const listItem = document.createElement("li");
    let findEnterIndex = text.indexOf("\n");
    if (findEnterIndex === -1) {
      const node = attributes
        ? applyAttributes(text, { ...attributes, list: undefined })
        : (() => {
            const span = document.createElement("span");
            span.textContent = text;
            return span;
          })();
      if (!node.textContent) node.textContent = " ";
      listItem.appendChild(node);
    } else {
      while (findEnterIndex !== -1) {
        const storeText = text.slice(0, findEnterIndex);
        const node = attributes
          ? applyAttributes(storeText, { ...attributes, list: undefined })
          : (() => {
              const span = document.createElement("span");
              span.textContent = storeText;
              return span;
            })();
        if (!node.textContent) node.textContent = " ";
        listItem.appendChild(node);
        const br = document.createElement("br");
        listItem.appendChild(br);
        text = text.slice(findEnterIndex + 1);
        findEnterIndex = text.indexOf("\n");
      }
      const node = attributes
        ? applyAttributes(text, { ...attributes, list: undefined })
        : (() => {
            const span = document.createElement("span");
            span.textContent = text;
            return span;
          })();
      if (!node.textContent) node.textContent = " ";
      listItem.appendChild(node);
    }
    currentList?.element.appendChild(listItem);
  };

  for (const op of delta) {
    if (!("insert" in op)) continue;
    const insertOp = op as InsertOp;
    const hasList = insertOp.attributes?.list;
    if (hasList) {
      handleList(insertOp);
    } else {
      handleParagraph(insertOp);
    }
  }
  // 记得最后刷新内容
  flushParagraph();
  flushList();
  return container.innerHTML;
};
