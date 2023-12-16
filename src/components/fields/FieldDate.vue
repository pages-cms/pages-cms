<template>
  <input
    class="input w-full"
    type="date"
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