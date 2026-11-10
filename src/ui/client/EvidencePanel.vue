<script setup lang="ts">
import { computed, ref } from "vue";
import { state } from "../../core/state";
import { addEvidence, deleteEvidence, draft, editEvidence, type EvidenceInput } from "../../core/commands";
import { evidenceImages, evidenceUrl } from "../../core/evidence";
import ComboBox, { type ComboItem } from "../components/ComboBox.vue";
import EvidenceImage from "./EvidenceImage.vue";

const selected = ref<number | null>(null);
// null: not editing; -1: adding a new item; otherwise the index being edited.
const editing = ref<number | null>(null);
const form = ref<EvidenceInput>({ name: "", description: "", image: "" });
const confirmDelete = ref(false);

const item = computed(() => (selected.value === null ? null : state.evidence[selected.value] ?? null));

function select(index: number) {
  selected.value = selected.value === index ? null : index;
  editing.value = null;
  confirmDelete.value = false;
}

function startAdd() {
  form.value = { name: "", description: "", image: "" };
  editing.value = -1;
  selected.value = null;
}

function startEdit(index: number) {
  const e = state.evidence[index];
  form.value = { name: e.name, description: e.description, image: e.image };
  editing.value = index;
}

function save() {
  const evidence = { ...form.value, name: form.value.name.trim(), image: form.value.image.trim() };
  if (!evidence.name) return;
  if (editing.value === -1) addEvidence(evidence);
  else if (editing.value !== null) editEvidence(editing.value, evidence);
  editing.value = null;
}

function remove(index: number) {
  deleteEvidence(index);
  if (draft.evidence === index) draft.evidence = -1;
  selected.value = null;
  confirmDelete.value = false;
}

function togglePresent(index: number) {
  draft.evidence = draft.evidence === index ? -1 : index;
}

const imageQuery = computed({
  get: () => form.value.image,
  set: (v: string) => (form.value.image = v),
});
const imageItems = computed<ComboItem[]>(() => {
  const q = form.value.image.trim().toLowerCase();
  return evidenceImages.names
    .filter((n) => !q || n.toLowerCase().includes(q))
    .slice(0, 50)
    .map((n) => ({ key: n, label: n }));
});
</script>

<template>
  <div class="evidence">
    <div class="head">
      <span class="muted">{{ state.evidence.length }} item{{ state.evidence.length === 1 ? "" : "s" }}</span>
      <button class="btn" @click="startAdd">Add evidence</button>
    </div>

    <form v-if="editing !== null" class="editor" @submit.prevent="save">
      <h3>{{ editing === -1 ? "New evidence" : "Edit evidence" }}</h3>
      <div class="editor-row">
        <div class="thumb large">
          <EvidenceImage v-if="form.image" :src="evidenceUrl(form.image)" :alt="form.name" />
        </div>
        <div class="fields">
          <label class="field">
            <span class="field-label">Name</span>
            <input v-model="form.name" class="input" required maxlength="80" />
          </label>
          <label class="field">
            <span class="field-label">Image</span>
            <ComboBox
              v-model="imageQuery"
              :items="imageItems"
              label="Evidence image"
              placeholder="Search images or type a file name…"
              empty-text="No known image matches; the typed name is used."
              @pick="(i) => (form.image = String(i.key))"
            />
          </label>
        </div>
      </div>
      <label class="field">
        <span class="field-label">Description</span>
        <textarea v-model="form.description" class="input textarea" rows="3"></textarea>
      </label>
      <div class="buttons">
        <button class="btn btn-primary" type="submit">{{ editing === -1 ? "Add" : "Save" }}</button>
        <button class="btn" type="button" @click="editing = null">Cancel</button>
      </div>
    </form>

    <p v-if="!state.evidence.length && editing === null" class="empty">No evidence in this area yet.</p>

    <ul class="grid" role="listbox" aria-label="Evidence">
      <li v-for="(e, i) in state.evidence" :key="i">
        <button
          class="card"
          role="option"
          :aria-selected="selected === i"
          :class="{ presenting: draft.evidence === i }"
          :title="e.name"
          @click="select(i)"
        >
          <span class="thumb"><EvidenceImage :src="evidenceUrl(e.image)" :alt="''" /></span>
          <span class="name">{{ e.name }}</span>
          <span v-if="draft.evidence === i" class="badge">Presenting</span>
        </button>
      </li>
    </ul>

    <section v-if="item && selected !== null && editing === null" class="detail" aria-live="polite">
      <div class="detail-row">
        <div class="thumb large"><EvidenceImage :src="evidenceUrl(item.image)" :alt="item.name" /></div>
        <div class="detail-text">
          <h3>{{ item.name }}</h3>
          <p class="description">{{ item.description || "No description." }}</p>
        </div>
      </div>
      <div class="buttons">
        <button class="btn" :class="{ 'btn-primary': draft.evidence !== selected }" @click="togglePresent(selected)">
          {{ draft.evidence === selected ? "Don't present" : "Present with next message" }}
        </button>
        <button class="btn" @click="startEdit(selected)">Edit</button>
        <button v-if="!confirmDelete" class="btn danger" @click="confirmDelete = true">Delete</button>
        <template v-else>
          <button class="btn danger" @click="remove(selected)">Delete for everyone</button>
          <button class="btn" @click="confirmDelete = false">Keep</button>
        </template>
      </div>
    </section>
  </div>
</template>

<style scoped>
.evidence {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px 12px max(32px, env(safe-area-inset-bottom));
}

.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.empty {
  margin: 16px 0;
  color: var(--text-muted);
  text-align: center;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(84px, 1fr));
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  width: 100%;
  padding: 6px 4px 8px;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  background: none;
  color: var(--text);
  font: inherit;
  cursor: pointer;
}

.card:hover {
  background: var(--surface-hover);
}

.card[aria-selected="true"] {
  border-color: var(--border);
  background: var(--surface);
}

.card.presenting .thumb {
  box-shadow: 0 0 0 2px var(--accent);
}

.thumb {
  display: grid;
  place-items: center;
  width: 64px;
  height: 64px;
  overflow: hidden;
  border-radius: var(--radius-sm);
  background: var(--surface-2);
}

.thumb.large {
  flex: none;
  width: 96px;
  height: 96px;
}

.thumb :deep(img) {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.name {
  max-width: 100%;
  font-size: 12px;
  line-height: 1.25;
  text-align: center;
  overflow-wrap: anywhere;
}

.badge {
  padding: 0 6px;
  border-radius: 999px;
  background: var(--accent);
  color: var(--accent-contrast);
  font-size: 10px;
  font-weight: 600;
}

.detail,
.editor {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface);
}

h3 {
  margin: 0;
  font-size: 15px;
}

.detail-row,
.editor-row {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.detail-text,
.fields {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.description {
  margin: 0;
  color: var(--text-muted);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.field-label {
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 600;
}

.textarea {
  min-height: 72px;
  padding: 8px 12px;
  resize: vertical;
}

.buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.danger {
  border-color: color-mix(in srgb, var(--danger) 45%, var(--border));
  color: var(--danger);
}
</style>
