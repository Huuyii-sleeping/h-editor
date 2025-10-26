<!-- DeltaRichEditor.vue -->
<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useFormatting } from "../composables/useFromatting";
import { useDeltaEditorCore } from "../composables/useDeltaEditorCore";

const editorEl = ref<HTMLDivElement | null>(null);
const core = useDeltaEditorCore(editorEl);
const formatting = useFormatting(editorEl, core);

const toggleBold = () => {
  const isActive = formatting.isFormatActive("bold");
  formatting.applyFormat("bold", !isActive);
};
onMounted(() => {
  core.renderToDOM();
});
</script>

<template>
  <div>
    <button
      @click="toggleBold"
      :class="{ active: formatting.isFormatActive('bold') }"
    >
      B
    </button>
    <div
      ref="editorEl"
      contenteditable="true"
      @input="core.handleInput"
      @blur="core.handleInput"
      style="height: 200px; border: 1px solid"
    ></div>
  </div>
</template>
