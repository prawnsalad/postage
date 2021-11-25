<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  name: String,
});

const initials = computed(() => {
    let ret = '';
    let name = props.name || '';

    let parts = name.split(' ');
    if (parts.length === 1) {
        ret = parts[0][0];
    } else if (parts.length > 1) {
        // First letter of the first + last name
        ret = parts[0][0] + parts[parts.length - 1][0];
    }

    return (ret || '').toUpperCase();
});

</script>

<template>
  <div class="avatar flex items-center justify-center">
      <div class="avatar-content text-white">{{initials}}</div>
  </div>
</template>

<style scoped>

.avatar {
    border-radius: 30%;
    width: 45px;
    height: 45px;
    background: red;
}
</style>
