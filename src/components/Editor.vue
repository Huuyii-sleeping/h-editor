<!-- DeltaRichEditor.vue -->
<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useFormatting } from "../composables/useFromatting";
import { useDeltaEditorCore } from "../composables/useDeltaEditorCore";
import { useSelection } from "../composables/useSelection";
import type { DeltaAttributes } from "../types/delta";

const editorEl = ref<HTMLDivElement | null>(null);
const selection = useSelection(editorEl);
const core = useDeltaEditorCore(editorEl, selection);
const formatting = useFormatting(editorEl, core);
const selectedColor = ref();
const selectedBackground = ref();
const showDialog = ref(false);
const linkUrl = ref("");
const showLinkDialog = () => {
  editorEl.value?.focus();
  const currnetRange = selection.getSelectedDeltaRange();
  if (!currnetRange || currnetRange.start === currnetRange.end) {
    alert("请先选中文本");
    return;
  }
  selection.savedSelection();
  showDialog.value = true;
  linkUrl.value = "";
};

const addLink = () => {
  if (linkUrl.value) {
    selection.restoreSelection();
    const deltaRange = selection.getSelectedDeltaRange();
    if (!deltaRange || deltaRange.start === deltaRange.end) {
      console.warn("No valid selection for link");
      closeDialog();
      return;
    }
    formatting.applyFormat("link", linkUrl.value);
  }
  closeDialog();
  editorEl.value?.focus();
};

const closeDialog = () => {
  selection.clearSelection();
  showDialog.value = false;
};

const toggleFormat = (format: keyof DeltaAttributes) => {
  const isActive = formatting.isFormatActive(format);
  formatting.applyFormat(format, !isActive);
};

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === "Enter") {
    const range = selection.getSelectedDeltaRange();
    if (!range || range.start !== range.end || !editorEl.value) return;
    const pos = range.start;
    const currentFormat = getCurrentFormatAtPosition(pos, core.delta.value) as any;
    if (currentFormat.list) {
      e.preventDefault();

      const text = core.getText();
      const lineStart = getLineStart(text, pos);
      const lineEnd = getLineEnd(text, pos);
      const currentLine = text
        .slice(lineStart, lineEnd)
        .replace(/\u200B/g, "")
        .trim();
      const newDelta = [...core.delta.value];
      insertAtPosition(newDelta, pos, "\n");
      core.delta.value = newDelta;
      if (currentLine === "") {
        core.formatRange(pos + 1, pos + 1, "list", false);
      } else {
        core.formatRange(pos + 1, pos + 1, "list", currentFormat.list);
      }
      core.renderToDOM();
      selection.setSelectionByDeltaPosition(pos + 1);
      return;
    }
  }
  if (e.ctrlKey || e.metaKey) {
    if (e.key === "z" && !e.shiftKey) {
      e.preventDefault();
      core.undo();
    } else if (e.key == "y" || (e.key === "z" && e.shiftKey)) {
      e.preventDefault();
      console.log(e);
      core.redo();
    } else if (e.key === "b") {
      e.preventDefault();
      toggleFormat("bold");
    } else if (e.key === "i") {
      toggleFormat("italic");
    } else if (e.key === "u") {
      e.preventDefault();
      toggleFormat("underline");
    }
  }
};

const getCurrentFormatAtPosition = (
  pos: number,
  delta: any[]
): DeltaAttributes | null => {
  let currentPos = 0;
  for (const op of delta) {
    if (!("insert" in op) || typeof op.insert !== "string") continue;
    const len = op.insert.length;
    if (currentPos <= pos && pos < currentPos + len) {
      return op.attributes || null;
    }
    currentPos += len;
  }
  return null;
};

const getLineStart = (text: string, pos: number): number => {
  for (let i = pos - 1; i >= 0; i--) {
    if (text[i] !== "\n") return i + 1;
  }
  return 0;
};

const getLineEnd = (text: string, pos: number): number => {
  for (let i = pos; i < text.length; i++) {
    if (text[i] === "\n") return i;
  }
  return text.length;
};

const insertAtPosition = (delta: any[], pos: number, text: string) => {
  let currentPos = 0;
  for (let i = 0; i < delta.length; i++) {
    const op = delta[i];
    if (!("insert" in op) || typeof op.insert !== "string") continue;
    const len = op.insert.length;
    if (currentPos <= pos && pos <= currentPos + len) {
      const before = op.insert.slice(0, pos - currentPos);
      const after = op.insert.slice(pos - currentPos);
      delta.splice(
        i,
        1,
        { insert: before, attributes: op.attributes },
        { insert: text },
        { insert: after, attributes: op.attributes }
      );
      return;
    }
    currentPos += len;
  }
  delta.push({ insert: text });
};

onMounted(() => {
  core.renderToDOM();
});
</script>

<template>
  <div class="editor-container">
    <!-- 工具栏 -->
    <div class="toolbar">
      <!-- 基础格式按钮 -->
      <button
        class="toolbar-btn"
        @click="toggleFormat('bold')"
        :class="{ active: formatting.isFormatActive('bold') }"
        title="加粗 (Ctrl+B)"
      >
        <strong>B</strong>
      </button>
      <button
        class="toolbar-btn"
        @click="toggleFormat('italic')"
        :class="{ active: formatting.isFormatActive('italic') }"
        title="斜体 (Ctrl+I)"
      >
        <em>I</em>
      </button>
      <button
        class="toolbar-btn"
        @click="toggleFormat('underline')"
        :class="{ active: formatting.isFormatActive('underline') }"
        title="下划线 (Ctrl+U)"
      >
        <span style="text-decoration: underline">U</span>
      </button>
      <button
        class="toolbar-btn"
        @click="toggleFormat('strike')"
        :class="{ active: formatting.isFormatActive('strike') }"
        title="删除线"
      >
        <s>S</s>
      </button>

      <button class="toolbar-btn" @click="showLinkDialog" title="链接">
        🔗
      </button>
      <button
        class="toolbar-btn"
        @click="() => formatting.applyFormat('list', 'bullet')"
        :class="{
          active:
            formatting.isFormatActive('list') &&
            formatting.getCurrentListType() === 'bullet',
        }"
        title="无序列表"
      >
        •
      </button>
      <button
        class="toolbar-btn"
        @click="formatting.applyFormat('list', 'ordered')"
        :class="{
          active:
            formatting.isFormatActive('list') &&
            formatting.getCurrentListType() === 'ordered',
        }"
        title="有序列表"
      >
        1.
      </button>

      <!-- 分隔线 -->
      <div class="toolbar-divider"></div>

      <!-- 文字颜色选择器（带图标+文字） -->
      <div class="toolbar-group" title="文字颜色">
        <div class="toolbar-icon">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M18 8h1a4 4 0 0 1 0 8h-1"></path>
            <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path>
            <line x1="6" y1="1" x2="6" y2="4"></line>
            <line x1="10" y1="1" x2="10" y2="4"></line>
            <line x1="14" y1="1" x2="14" y2="4"></line>
          </svg>
        </div>
        <input
          type="color"
          v-model="selectedColor"
          @change="() => formatting.applyFormat('color', selectedColor)"
          class="color-input"
        />
        <span class="toolbar-label">文字</span>
      </div>

      <!-- 背景色选择器（带图标+文字） -->
      <div class="toolbar-group" title="背景颜色">
        <div class="toolbar-icon">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <circle cx="8.5" cy="8.5" r="1.5"></circle>
            <polyline points="21 15 16 10 5 21"></polyline>
          </svg>
        </div>
        <input
          type="color"
          v-model="selectedBackground"
          @change="
            () => formatting.applyFormat('background', selectedBackground)
          "
          class="color-input"
        />
        <span class="toolbar-label">背景</span>
      </div>

      <!-- 分隔线 -->
      <div class="toolbar-divider"></div>

      <!-- 标题按钮 -->
      <button
        class="toolbar-btn"
        @click="() => formatting.applyFormat('header', 1)"
        :class="{ active: formatting.isFormatActive('header') }"
        title="一级标题"
      >
        H1
      </button>
      <button
        class="toolbar-btn"
        @click="() => formatting.applyFormat('header', 2)"
        :class="{ active: formatting.isFormatActive('header') }"
        title="二级标题"
      >
        H2
      </button>
    </div>

    <!-- 编辑区域（保持不变） -->
    <div
      ref="editorEl"
      class="editor"
      contenteditable="true"
      @keydown="handleKeydown"
      @input="core.handleInput"
      @blur="core.handleInput"
    ></div>
  </div>
  <div v-if="showDialog" class="dialog">
    <input
      v-model="linkUrl"
      placeholder="请输入链接"
      @keydown.enter="addLink"
    />
    <button @click="addLink">Yes</button>
    <button @click="closeDialog">No</button>
  </div>
</template>

<style scoped>
/* 编辑器容器 - 增强阴影和圆角 */
.editor-container {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen,
    Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
  max-width: 900px;
  margin: 30px auto;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  background-color: #fff;
}

/* 工具栏 - 优化布局和背景 */
.toolbar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 12px 20px;
  background-color: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
  flex-wrap: wrap;
}

/* 分隔线 - 区分功能组 */
.toolbar-divider {
  width: 1px;
  height: 24px;
  background-color: #e9ecef;
  margin: 0 8px;
}

/* 基础格式按钮 - 优化hover和激活态 */
.toolbar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border: none;
  border-radius: 6px;
  background-color: #fff;
  color: #343a40;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.toolbar-btn:hover {
  background-color: #f1f3f5;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
}

.toolbar-btn.active {
  background-color: #2f5496;
  color: #fff;
  box-shadow: 0 2px 6px rgba(47, 84, 150, 0.3);
}

.toolbar-btn.active:hover {
  background-color: #234075;
}

/* 颜色选择器组 - 横向布局+明确区分 */
.toolbar-group {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 8px;
  height: 38px;
  background-color: #fff;
  border-radius: 6px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  transition: all 0.2s ease;
}

.toolbar-group:hover {
  background-color: #f1f3f5;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
}

/* 颜色选择器图标 - 区分文字/背景 */
.toolbar-icon {
  color: #495057;
}

/* 颜色输入框 - 美化样式 */
.color-input {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  padding: 0;
  margin: 0;
  background: transparent;
  /* 隐藏原生边框，用自定义样式替代 */
  appearance: none;
  -webkit-appearance: none;
}

.color-input::-webkit-color-swatch-wrapper {
  padding: 2px;
}

.color-input::-webkit-color-swatch {
  border: 1px solid #dee2e6;
  border-radius: 50%;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

/* 颜色选择器文字标签 - 明确标识 */
.toolbar-label {
  font-size: 12px;
  color: #495057;
  font-weight: 500;
}

/* 编辑区域 - 优化排版和聚焦效果 */
.editor {
  min-height: 300px;
  padding: 20px;
  line-height: 1.8;
  font-size: 15px;
  border: none;
  outline: none;
  color: #212529;
  background-color: #fff;
}

.editor:focus {
  box-shadow: inset 0 0 0 2px rgba(47, 84, 150, 0.2);
}

/* 适配小屏幕 - 避免工具栏溢出 */
@media (max-width: 600px) {
  .toolbar {
    padding: 8px 12px;
    gap: 2px;
  }

  .toolbar-group {
    padding: 0 4px;
  }

  .toolbar-label {
    display: none; /* 小屏幕隐藏文字标签，保留图标和颜色框 */
  }
}
.a-basic {
  color: #2f5496;
  text-decoration: none;
  font-weight: 500;
  position: relative;
  padding-bottom: 2px;
}

.a-basic:hover {
  color: #234075;
}

.a-basic::after {
  content: "";
  position: absolute;
  bottom: 0;
  left: 0;
  width: 0;
  height: 2px;
  background-color: #2f5496;
  transition: width 0.3s ease;
}

.a-basic:hover::after {
  width: 100%;
}
</style>
