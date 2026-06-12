import { createContext, useContext, type ParentProps, type JSX, Show } from "solid-js";
import { createStore } from "solid-js/store";
import { Portal, useRenderer, useTerminalDimensions } from "@opentui/solid";
import { RGBA } from "@opentui/core";
import { useBindings } from "@opentui/keymap/solid";
import { tokens } from "../tokens.ts";

interface DialogItem {
  element: JSX.Element;
  onClose?: () => void;
}

interface DialogContextValue {
  show(element: JSX.Element, onClose?: () => void): void;
  replace(element: JSX.Element, onClose?: () => void): void;
  clear(): void;
}

const DialogContext = createContext<DialogContextValue>();

function DialogOverlay(props: ParentProps<{ onClose: () => void }>) {
  const dimensions = useTerminalDimensions();

  return (
    <box
      width={dimensions().width}
      height={dimensions().height}
      alignItems="center"
      justifyContent="center"
      position="absolute"
      zIndex={3000}
      left={0}
      top={0}
      backgroundColor={RGBA.fromInts(0, 0, 0, 150)}
    >
      <box
        width={60}
        maxWidth={dimensions().width - 4}
        backgroundColor={tokens.surface}
        padding={1}
        flexDirection="column"
        gap={1}
      >
        {props.children}
      </box>
    </box>
  );
}

export function DialogProvider(props: ParentProps) {
  const [store, setStore] = createStore({
    stack: [] as DialogItem[],
  });

  const renderer = useRenderer();

  useBindings(() => ({
    enabled: store.stack.length > 0,
    bindings: [
      {
        key: "escape",
        desc: "Close dialog",
        group: "Dialog",
        cmd: () => {
          const current = store.stack.at(-1);
          current?.onClose?.();
          setStore("stack", store.stack.slice(0, -1));
        },
      },
    ],
  }));

  const value: DialogContextValue = {
    show(element: JSX.Element, onClose?: () => void) {
      setStore("stack", [...store.stack, { element, onClose }]);
    },
    replace(element: JSX.Element, onClose?: () => void) {
      for (const item of store.stack) {
        item.onClose?.();
      }
      setStore("stack", [{ element, onClose }]);
    },
    clear() {
      for (const item of store.stack) {
        item.onClose?.();
      }
      setStore("stack", []);
    },
  };

  return (
    <DialogContext.Provider value={value}>
      {props.children}
      <Portal mount={renderer.root}>
        <Show when={store.stack.length > 0}>
          <DialogOverlay onClose={() => value.clear()}>{store.stack.at(-1)?.element}</DialogOverlay>
        </Show>
      </Portal>
    </DialogContext.Provider>
  );
}

export function useDialog(): DialogContextValue {
  const value = useContext(DialogContext);
  if (!value) {
    throw new Error("useDialog must be used within a DialogProvider");
  }
  return value;
}
