<script setup lang="ts">

const props = defineProps<{
  small?: boolean,
}>();

</script>

<template>
  <div class="logo bg-primary-600">
      <div class="border border-primary-400">{{small ? 'P' : 'Postage' }}</div>
  </div>
</template>

<style scoped>
.logo {
    /*aspect-ratio: 2.45;*/
    display: inline-flex;
    flex-direction: column;
}
.logo > div {
    margin: 6px;
    padding: 2em 2em 6px 6px;
    display: flex;
    justify-content: flex-end;
    flex-direction: column;

    color: #fff;
    font-weight: bold;
    font-size: 100%;
    line-height: 100%;
}
</style>
