import { createContext, useContext, type ParentProps, type JSX, Show } from "solid-js";
import { createStore } from "solid-js/store";
import { useTerminalDimensions } from "@opentui/solid";
import { useBindings } from "@opentui/keymap/solid";

import { tokens } from "../tokens.ts";

/**
 * Renderable dialog content.
 *
 * Prefer passing a factory, for example `dialog.replace(() => <UpdateDialog />)`,
 * when the dialog component uses Solid hooks or context. The provider renders the
 * factory inside the active dialog owner so hooks like `useDialog()` and
 * `useBindings()` resolve correctly.
 */
type DialogElement = JSX.Element | (() => JSX.Element);

interface DialogItem {
  element: DialogElement;
  onClose?: () => void;
}

/**
 * Dialog stack controller exposed to components below `DialogProvider`.
 *
 * The stack lets temporary UI layers compose without each caller needing to know
 * who opened the previous layer. `show()` pushes a new layer, `replace()` closes
 * all current layers and opens one layer, and `clear()` closes everything.
 */
export interface DialogContextValue {
  /** Pushes a dialog on top of the current stack. */
  show(element: DialogElement, onClose?: () => void): void;
  /** Closes existing dialogs and opens a single replacement dialog. */
  replace(element: DialogElement, onClose?: () => void): void;
  /** Closes all dialogs and runs their close callbacks. */
  clear(): void;
  /** Whether at least one dialog is currently open. */
  active(): boolean;
}

const DialogContext = createContext<DialogContextValue>();

function renderDialogElement(element: DialogElement | undefined) {
  if (typeof element === "function") return element();
  return element;
}

/** Full-screen overlay that centers the active dialog content. */
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
      backgroundColor={tokens.surfaceOverlay}
    >
      <box
        width={60}
        maxWidth={dimensions().width - 4}
        backgroundColor={tokens.bg}
        paddingY={1}
        paddingX={2}
        flexDirection="column"
        gap={1}
      >
        {props.children}
      </box>
    </box>
  );
}

/**
 * Provides dialog stack state and keyboard behavior for modal overlays.
 *
 * `DialogProvider` must be rendered below `KeymapProvider` because it registers
 * an Escape binding with `useBindings()`. That binding is enabled only while the
 * stack has entries, so normal app-level Escape handling can remain inactive
 * until a dialog is actually open.
 */
export function DialogProvider(props: ParentProps) {
  const [store, setStore] = createStore({
    stack: [] as DialogItem[],
  });

  // Dialogs are stack based so future flows can open a confirmation dialog from
  // another dialog without losing the original layer underneath it.
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
          // Escape only pops the active layer. Call `clear()` from dialog actions
          // when the whole modal workflow should be dismissed.
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
      setStore("stack", [{ element, onClose }]);
    },
    clear() {
      for (const item of store.stack) {
        item.onClose?.();
      }
      setStore("stack", []);
    },
    active() {
      return store.stack.length > 0;
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

/**
 * Returns the active dialog controller.
 *
 * Use this inside components rendered below `DialogProvider` to open or close
 * modal UI. Calling it outside the provider is a programmer error and throws.
 */
export function useDialog(): DialogContextValue {
  const value = useContext(DialogContext);
  if (!value) {
    throw new Error("useDialog must be used within a DialogProvider");
  }
  return value;
}
