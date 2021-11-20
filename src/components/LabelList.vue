<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  labels: Array,
  activeLabel: Object
});

const staticLabels = computed(() => {
  return props.labels.filter(l => !l.custom);
});
const customLabels = computed(() => {
  // TODO: Order by f.name
  return props.labels.filter(l => l.custom);
});

</script>

<template>
  <div class="overflow-y-auto">
    <div
      v-for="l in staticLabels"
      class="flex py-2 px-2 border-l-4 border-transparent"
      :class="[
        l.name === activeLabel?.name ? 'bg-primary-100' : '',
        l.name === activeLabel?.name ? 'border-primary-500' : '',
      ]"
      :key="l.name"
      @click="$emit('label:selected', l)"
    >
      <a class="cursor-pointer flex-grow">{{ l.name }}</a>
      <div class="text-sm">
        <span class="label">1,234</span>
      </div>
    </div>

    <div
      v-for="l in customLabels"
      class="flex py-2 px-2 border-l-4 border-transparent"
      :class="[
        l.name === activeLabel?.name ? 'bg-primary-100' : '',
        l.name === activeLabel?.name ? 'border-primary-500' : '',
      ]"
      :key="l.name"
      @click="$emit('label:selected', l)"
    >
      <a class="cursor-pointer flex-grow">{{ l.name }}</a>
      <div class="text-sm">
        <span class="label">1,234</span>
      </div>
    </div>
  </div>
</template>

<style scoped>

</style>
