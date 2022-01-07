<script setup lang="ts">

import { nextTick } from 'vue';
import { useRouter } from 'vue-router';

import AppInstance from '@/services/AppInstance';
import Logo from '@/components/Logo.vue';

const router = useRouter();
nextTick(async () => {
    await AppInstance.instance().account.logout();
    await sleep(2000);
    router.push({name: 'login'});
});

function sleep(l) {
  return new Promise(r => setTimeout(r, l));
}

</script>

<template>
    <div class="text-center mt-8">
        <logo />
        <div class="mt-4">Signing out..</div>
    </div>
</template>

<style scoped>

</style>
