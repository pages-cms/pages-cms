<template>
  <Teleport to="body">
    <div @click="closeModal" class="modal-overlay" :class="[ isOpen ? 'modal-active' : '', props.customClass ]">
      <div class="modal-wrapper">
        <div v-if="isInitialized" class="modal-box" @click.stop>
          <header class="modal-header">
            <div class="modal-title">
              <slot name="header"></slot>
            </div>
            <button @click="closeModal" class="modal-close">
              <svg class="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 6L6 18M6 6L18 18" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          </header>
          <div class="modal-body">
            <slot name="content"></slot>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';

const props = defineProps({
  customClass: { type: String, default: '' }
});

const isOpen = ref(false);
const isInitialized = ref(false);

const closeModal = () => {
  isOpen.value = false;
  removeEscapeKeyListener();
};

const openModal = () => {
  isOpen.value = true;
  isInitialized.value = true;
  addEscapeKeyListener();
};

const onEscape = (event) => {
  if (event.key === 'Escape') {
    closeModal();
  }
};

const addEscapeKeyListener = () => {
  window.addEventListener('keydown', onEscape);
};

const removeEscapeKeyListener = () => {
  window.removeEventListener('keydown', onEscape);
};

onMounted(() => {
  if (isOpen.value) {
    addEscapeKeyListener();
  }
});

onUnmounted(() => {
  removeEscapeKeyListener();
});

defineExpose({ openModal, closeModal });
</script>
