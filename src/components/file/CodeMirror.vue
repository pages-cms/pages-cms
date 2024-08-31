<template>
  <MonacoEditor
    :modelValue="modelValue"
    :language="language"
    @update:modelValue="$emit('update:modelValue', $event)"
  />
</template>

<script setup>
import MonacoEditor from './MonacoEditor.vue';

const props = defineProps({
  modelValue: { type: String, default: '' },
  language: { type: String, default: 'markdown' }
});

const emit = defineEmits(['update:modelValue']);
</script>
