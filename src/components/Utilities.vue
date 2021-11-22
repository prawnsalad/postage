<script setup>
import { ref, computed } from 'vue';
import InlineSvg from 'vue-inline-svg';

const props = defineProps({
  activeMessage: Object,
  activeLabel: Object
});

</script>

<template>
  <div class="flex text-2xl pr-4">
      <div style="">
        <inline-svg src="/svg/mail.svg" class="inline m-2 hover:text-primary-500 cursor-pointer" />
      </div>

      <div style="">
        <inline-svg src="/svg/calender.svg" class="inline m-2 hover:text-primary-500 cursor-pointer" />
      </div>

      <div style="">
        <inline-svg src="/svg/todo.svg" class="inline m-2 hover:text-primary-500 cursor-pointer" />
      </div>
  </div>
</template>

<style scoped>

</style>
