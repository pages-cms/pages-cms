<template>
  <input type="file" ref="fileInput" @change="handleFileInput" multiple hidden />
  <!-- Waiting overlay -->
  <Teleport to="body">
    <div class="waiting" v-show="status === 'uploaded'"></div>
  </Teleport>
</template>

<script setup>
import { ref, inject } from 'vue';
import notifications from '@/services/notifications';
import github from '@/services/github';

const emits = defineEmits(['processed', 'uploaded', 'error']);

const props = defineProps({
  owner: String,
  repo: String,
  branch: String,
  path: String,
});

const fileInput = ref(null);
const status = ref('');
const repoStore = inject('repoStore', { owner: null, repo: null, branch: null, config: null, details: null });

function openFileInput() {
  fileInput.value.click();
}

const handleFileInput = async (event) => {
  const files = event.target.files;
  await processFiles(files);
};

async function processFiles(files) {
  status.value = 'uploading';
  for (let i = 0; i < files.length; i++) {
    await upload(files[i]);
  }
  emits('processed');
  status.value = '';
}

async function generateSha256Hash(fileName) {
  const encoder = new TextEncoder();
  const data = encoder.encode(fileName);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
}

const upload = async (file) => {
  if (file) {
    let content = await readFileContent(file);
    if (content) {
      const isHashNameEnabled = repoStore.config?.document?.media?.hash;
      const fileName = isHashNameEnabled
        ? `${await generateSha256Hash(file.name)}${file.name.match(/\.[^\.]+$/)[0]}`
        : file.name;
      const notificationId = notifications.notify(`Uploading "${file.name}".`, 'processing', { delay: 0 });
      content = content.replace(/^(.+,)/, ''); // We strip out the info at the beginning of the file (mime type + encoding)
      const fullPath = props.path ? `${props.path}/${fileName}` : fileName;
      const data = await github.saveFile(props.owner, props.repo, props.branch, fullPath, content, null, true);
      notifications.close(notificationId);
      if (data) {
        if (data.content.path === fullPath) {
          notifications.notify(`File '${fileName}' successfully uploaded.`, 'success');
        } else {
          notifications.notify(`File '${fileName}' successfully uploaded but renamed to '${data.content.name}'.`, 'success');
        }
        emits('uploaded', data);
      } else {
        notifications.notify(`File upload failed.`, 'error');
        emits('error', data);
      }
    }
  }
};

const readFileContent = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(file); // Reads the file as base64 encoded string
  });
};

defineExpose({ openFileInput, processFiles });
</script>