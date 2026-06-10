import {
  BoxRenderable,
  TextRenderable,
  Box,
  Text,
  RGBA,
  TextAttributes,
  type CliRenderer,
  type StyledText,
} from "@opentui/core";

export interface ModalController {
  show(): void;
  hide(): void;
  setBody(content: string | StyledText): void;
  destroy(): void;
}

export function createModal(
  renderer: CliRenderer,
  opts: { id: string; title: string },
): ModalController {
  const bodyText = new TextRenderable(renderer, {
    id: `${opts.id}-body`,
    content: "",
  });

  const backdrop = Box({
    id: `${opts.id}-backdrop`,
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    backgroundColor: RGBA.fromValues(0, 0, 0, 0.5),
  });

  const content = Box(
    {
      id: `${opts.id}-content`,
      borderStyle: "rounded",
      padding: 2,
      flexDirection: "column",
      gap: 1,
      backgroundColor: "#1a1a2e",
    },
    Text({ content: opts.title, attributes: TextAttributes.BOLD }),
    bodyText,
    Text({ content: "Press ESC to close", attributes: TextAttributes.DIM }),
  );

  const root = new BoxRenderable(renderer, {
    id: opts.id,
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
    visible: false,
  });

  root.add(backdrop);
  root.add(content);

  renderer.root.add(root);

  root.onKeyDown = (key) => {
    if (key.name === "escape") {
      root.visible = false;
    }
  };

  function show() {
    root.visible = true;
    root.focus();
  }

  function hide() {
    root.visible = false;
  }

  function setBody(content: string | StyledText) {
    bodyText.content = content;
  }

  function destroy() {
    root.destroyRecursively();
  }

  return { show, hide, setBody, destroy };
}
