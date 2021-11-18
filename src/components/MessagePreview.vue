<script setup>
import { ref, reactive } from 'vue'

defineProps({
  message: Object
})

const options = reactive({
    avatars: true,
});

</script>

<template>
  <div class="message-preview overflow-y-auto">
    <h3>{{message.topic}}</h3>
    <div>{{message.fromName}}</div>
  </div>
</template>

<style scoped>

</style>
