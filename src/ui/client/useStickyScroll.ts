import { nextTick, onMounted, ref, watch, type WatchSource } from "vue";

/** Keeps a scroll container pinned to the bottom as `source` grows, unless the reader scrolled up. */
export function useStickyScroll(source: WatchSource<unknown>) {
  const el = ref<HTMLElement>();
  let pinned = true;

  const onScroll = () => {
    const box = el.value!;
    pinned = box.scrollTop + box.clientHeight >= box.scrollHeight - 48;
  };

  const toBottom = () => {
    if (el.value) el.value.scrollTop = el.value.scrollHeight;
  };

  watch(source, async () => {
    if (!pinned) return;
    await nextTick();
    toBottom();
  });

  onMounted(toBottom);

  // A hidden panel has no height, so it can't follow along; catch up when shown.
  const onVisible = () => {
    if (pinned) toBottom();
  };

  return { el, onScroll, onVisible };
}
