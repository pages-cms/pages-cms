<template>
  <textarea
    class="input w-full"
    rows="20"
    :value="modelValue"
    @input="$emit('update:modelValue', $event.target.value)"
  />
</template>

<script setup>
const props = defineProps({
  field: Object,
  modelValue: String
});
</script>