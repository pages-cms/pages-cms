<template>
  <div ref="editorContainer" class="monaco-editor"></div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import * as monaco from 'monaco-editor';
import theme from '@/services/theme';

const props = defineProps({
  modelValue: { type: String, default: '' },
  language: { type: String, default: 'markdown' }
});

const emit = defineEmits(['update:modelValue']);
const editorContainer = ref(null);
let editor = null;

const isDarkMode = ref(theme.getTheme() === 'dark');

onMounted(() => {
  editor = monaco.editor.create(editorContainer.value, {
    value: props.modelValue,
    language: props.language,
    automaticLayout: true,
    theme: isDarkMode.value ? 'vs-dark' : 'vs-light'
  });

  editor.onDidChangeModelContent(() => {
    emit('update:modelValue', editor.getValue());
  });
});

watch(() => props.modelValue, (newValue) => {
  if (editor && newValue !== editor.getValue()) {
    editor.setValue(newValue);
  }
});

watch(isDarkMode, (newValue) => {
  if (editor) {
    monaco.editor.setTheme(newValue ? 'vs-dark' : 'vs-light');
  }
});

onBeforeUnmount(() => {
  if (editor) {
    editor.dispose();
  }
});

// Watch for changes in the theme
const updateTheme = () => {
  isDarkMode.value = theme.getTheme() === 'dark';
  if (editor) {
    monaco.editor.setTheme(isDarkMode.value ? 'vs-dark' : 'vs-light');
  }
};

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', updateTheme);
</script>

<style scoped>
.monaco-editor {
  width: 100%;
  min-height: 350px;
  padding: 1rem 0;
}
</style>
