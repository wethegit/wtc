import { createContext, useContext, type ParentProps, type JSX, Show } from "solid-js";
import { createStore } from "solid-js/store";
import { useTerminalDimensions } from "@opentui/solid";
import { RGBA } from "@opentui/core";
import { useBindings } from "@opentui/keymap/solid";
import { tokens } from "../tokens.ts";

type DialogElement = JSX.Element | (() => JSX.Element);

interface DialogItem {
  element: DialogElement;
  onClose?: () => void;
}

export interface DialogContextValue {
  show(element: DialogElement, onClose?: () => void): void;
  replace(element: DialogElement, onClose?: () => void): void;
  clear(): void;
}

const DialogContext = createContext<DialogContextValue>();

function renderDialogElement(element: DialogElement | undefined) {
  if (typeof element === "function") return element();
  return element;
}

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
    show(element: DialogElement, onClose?: () => void) {
      setStore("stack", [...store.stack, { element, onClose }]);
    },
    replace(element: DialogElement, onClose?: () => void) {
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
      <Show when={store.stack.length > 0}>
        <DialogOverlay onClose={() => value.clear()}>
          {renderDialogElement(store.stack.at(-1)?.element)}
        </DialogOverlay>
      </Show>
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
