<!-- DeltaRichEditor.vue -->
<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useFormatting } from "../composables/useFromatting";
import { useDeltaEditorCore } from "../composables/useDeltaEditorCore";
import { useSelection } from "../composables/useSelection";

const editorEl = ref<HTMLDivElement | null>(null);
const selection = useSelection(editorEl);
const core = useDeltaEditorCore(editorEl, selection);
const formatting = useFormatting(editorEl, core);

const toggleBold = () => {
  const isActive = formatting.isFormatActive("bold");
  formatting.applyFormat("bold", !isActive);
};

const handleKeydown = (e: KeyboardEvent) => {
  if (e.ctrlKey || e.metaKey) {
    if (e.key === "z" && !e.shiftKey) {
      e.preventDefault();
      core.undo();
    } else if (e.key == "y" || (e.key === "z" && e.shiftKey)) {
      e.preventDefault();
      console.log(e)
      core.redo();
    }
  }
};
onMounted(() => {
  core.renderToDOM();
});
</script>

<template>
  <div class="editor-container" @keydown="handleKeydown">
    <!-- 工具栏 -->
    <div class="toolbar">
      <button
        class="toolbar-btn"
        @click="toggleBold"
        :class="{ active: formatting.isFormatActive('bold') }"
      >
        B
      </button>
      <button
        class="toolbar-btn"
        @click="() => formatting.applyFormat('header', 1)"
      >
        H1
      </button>
      <button
        class="toolbar-btn"
        @click="() => formatting.applyFormat('header', 2)"
      >
        H2
      </button>
    </div>
    <div
      ref="editorEl"
      class="editor"
      contenteditable="true"
      @input="core.handleInput"
      @blur="core.handleInput"
    ></div>
  </div>
</template>

<style scoped>
/* 编辑器容器 */
.editor-container {
  max-width: 800px;
  margin: 20px auto;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

/* 工具栏 */
.toolbar {
  display: flex;
  gap: 8px;
  padding: 10px 15px;
  background-color: #f5f7fa;
  border-bottom: 1px solid #eaecef;
}

/* 工具栏按钮 */
.toolbar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 4px;
  background-color: #fff;
  color: #333;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.toolbar-btn:hover {
  background-color: #eaecef;
}

/* 激活状态的按钮 */
.toolbar-btn.active {
  background-color: #2f5496;
  color: #fff;
  box-shadow: 0 1px 3px rgba(47, 84, 150, 0.3);
}

/* 编辑区域 */
.editor {
  min-height: 200px;
  padding: 15px;
  line-height: 1.6;
  font-size: 14px;
  border: none;
  outline: none;
}

/* 编辑区域聚焦时的样式 */
.editor:focus {
  box-shadow: inset 0 0 0 2px rgba(47, 84, 150, 0.2);
}
</style>
