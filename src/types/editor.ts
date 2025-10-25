export type FormType = "strong" | "em" | "h1" | "h2" | "ul" | "ol";

export interface EditorInstance {
  element: HTMLElement | null;
  getHTML(): string;
  setHTML(html: string): void;
}
