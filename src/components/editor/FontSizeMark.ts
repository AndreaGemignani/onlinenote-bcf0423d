import { Mark, mergeAttributes } from "@tiptap/core";

export type FontSizeValue = "small" | "medium" | "large";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    fontSize: {
      setFontSize: (size: FontSizeValue) => ReturnType;
      unsetFontSize: () => ReturnType;
    };
  }
}

export const FontSizeMark = Mark.create({
  name: "fontSize",
  addAttributes() {
    return {
      size: {
        default: "medium",
        parseHTML: (el) => el.getAttribute("data-font-size") || "medium",
        renderHTML: (attrs) => ({ "data-font-size": attrs.size }),
      },
    };
  },
  parseHTML() {
    return [{ tag: "span[data-font-size]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes), 0];
  },
  addCommands() {
    return {
      setFontSize:
        (size) =>
        ({ commands }) =>
          commands.setMark(this.name, { size }),
      unsetFontSize:
        () =>
        ({ commands }) =>
          commands.unsetMark(this.name),
    };
  },
});