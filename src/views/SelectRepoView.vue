<template>
  <div class="h-screen flex justify-center items-center bg-dneutral-200">
    <div class="w-[500px]">
      <h1 class="font-semibold text-2xl mb-6 text-center">Select a repository</h1>
      <repo-picker/>
    </div>
  </div>
</template>

<script setup>
import RepoPicker from '@/components/RepoPicker.vue';
</script>