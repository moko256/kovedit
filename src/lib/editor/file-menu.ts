export const FILE_MENU_LABEL = "ファイル";

export const FILE_MENU_ITEMS = [
  { id: "file-open", text: "開く" },
  { id: "file-save", text: "保存" },
  { id: "file-export", text: "エクスポート" },
] as const;

export type FileMenuItemId = (typeof FILE_MENU_ITEMS)[number]["id"];

export type FileMenuActions = {
  open?: () => void;
  save?: () => void;
  export?: () => void | Promise<void>;
};

export function noopFileMenuAction(): void {}

export function resolveFileMenuAction(
  id: FileMenuItemId,
  actions: FileMenuActions = {},
): () => void {
  if (id === "file-open") {
    return actions.open ?? noopFileMenuAction;
  }
  if (id === "file-save") {
    return actions.save ?? noopFileMenuAction;
  }
  return () => {
    void (actions.export ?? noopFileMenuAction)();
  };
}
