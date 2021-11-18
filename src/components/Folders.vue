<script setup>
import { ref } from 'vue'

defineProps({
  folders: Array,
  activeFolder: Object
});


</script>

<template>
  <div class="folders overflow-y-auto">
    <div
      v-for="f in folders"
      class="folder flex py-2 px-2 border-l-4 border-transparent"
      :class="[
        f.name === activeFolder?.name ? 'bg-primary-100' : '',
        f.name === activeFolder?.name ? 'border-primary-500' : '',
      ]"
      :key="f.name"
      @click="$emit('folder:selected', f)"
    >
      <a class="cursor-pointer flex-grow">{{ f.name }}</a>
      <div class="labels text-sm">
        <span class="label">1,234</span>
      </div>
    </div>
  </div>
</template>

<style scoped>

</style>
