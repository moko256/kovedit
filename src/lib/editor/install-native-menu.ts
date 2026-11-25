import {
  FILE_MENU_ITEMS,
  FILE_MENU_LABEL,
  noopFileMenuAction,
} from "./file-menu.js";

export async function installNativeAppMenu(): Promise<void> {
  const { Menu, Submenu } = await import("@tauri-apps/api/menu");

  const appMenu = await Submenu.new({
    text: "kovedit",
    items: [
      { item: { About: null } },
      { item: "Separator" },
      { item: "Hide" },
      { item: "HideOthers" },
      { item: "ShowAll" },
      { item: "Separator" },
      { item: "Quit" },
    ],
  });

  const fileMenu = await Submenu.new({
    text: FILE_MENU_LABEL,
    items: FILE_MENU_ITEMS.map((item) => ({
      id: item.id,
      text: item.text,
      action: noopFileMenuAction,
    })),
  });

  const menu = await Menu.new({
    items: [appMenu, fileMenu],
  });
  const previous = await menu.setAsAppMenu();
  await previous?.close();
}
