<script setup lang="ts">
import { onMounted, ref } from "vue";

// Hosts markup from a client.html <template> until its Vue replacement lands.
// The legacy modules find these elements by id, so it must be mounted exactly once.
const props = defineProps<{ template: string }>();
const root = ref<HTMLElement>();

onMounted(() => {
  const template = document.getElementById(props.template) as HTMLTemplateElement | null;
  if (!template || !root.value) throw new Error(`missing legacy template #${props.template}`);
  const content = template.content.cloneNode(true) as DocumentFragment;
  content.querySelectorAll("meta").forEach((m) => m.remove());
  root.value.append(content);
});
</script>

<template>
  <div ref="root" class="legacy"></div>
</template>
