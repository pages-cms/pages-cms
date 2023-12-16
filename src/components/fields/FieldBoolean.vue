<template>
  <div>
    <label class="relative block inline-flex items-center cursor-pointer">
      <input
        class="sr-only peer"
        type="checkbox"
        :checked="modelValue"
        @change="$emit('update:modelValue', $event.target.checked)"
      />
      <div class="w-11 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-100 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-neutral-950 transition-all"></div>
    </label>
  </div>
  
</template>

<script setup>
const props = defineProps({
  field: Object,
  modelValue: Boolean
});
</script>