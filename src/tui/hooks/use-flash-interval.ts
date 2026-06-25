import { createSignal, onCleanup, onMount } from "solid-js";

/**
 * Toggles a boolean signal on a repeating interval for flash/attention effects.
 *
 * Example: `const flashOn = useFlashInterval(800)` returns a signal that
 * alternates every 800ms, suitable for blinking timer indicators.
 */
export function useFlashInterval(intervalMs = 800): () => boolean {
  const [flashOn, setFlashOn] = createSignal(true);

  onMount(() => {
    const interval = setInterval(() => setFlashOn((prev) => !prev), intervalMs);
    onCleanup(() => clearInterval(interval));
  });

  return flashOn;
}
