<script setup>
import { ref, reactive } from 'vue'

const props = defineProps({
    message: Object
})

const emit = defineEmits([
    'close',
]);

const options = reactive({
    avatars: true,
});

</script>

<template>
  <div class="message-preview overflow-y-auto">
    <div class="p-2 flex justify-end">
      <button @click="$emit('close')">[X]</button>
    </div>
    <h3>{{message.topic}}</h3>
    <div>{{message.fromName}}</div>
  </div>
</template>

<style scoped>

</style>
