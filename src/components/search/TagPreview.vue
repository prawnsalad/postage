<script setup lang="ts">

const props = defineProps({
    value: String,
});

</script>

<template>
    <span v-if="!props.value" class="text-neutral-400 italic">
        <slot></slot>
    </span>
    {{ props.value ? props.value : '' }}
</template>

<style scoped>
</style>