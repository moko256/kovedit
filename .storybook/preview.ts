import type { Preview } from "@storybook/sveltekit";
import "../src/routes/layout.css";
import PreviewDecorator from "./PreviewDecorator.svelte";

const preview: Preview = {
  decorators: [() => PreviewDecorator],
  parameters: {
    layout: "fullscreen",
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
