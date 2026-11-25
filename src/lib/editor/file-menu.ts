export const FILE_MENU_LABEL = "ファイル";

export const FILE_MENU_ITEMS = [
  { id: "file-open", text: "開く" },
  { id: "file-save", text: "保存" },
  { id: "file-export", text: "エクスポート" },
] as const;

export function noopFileMenuAction(): void {}
