<template>
  <fieldset>
    <field
      v-for="childField in field.fields"
      :key="childField.name"
      :field="childField"
      :model="modelValue"></field>
  </fieldset>
</template>

<script setup>
import Field from '@/components/file/Field.vue';

const props = defineProps({
  field: Object,
  modelValue: Object
});
</script>