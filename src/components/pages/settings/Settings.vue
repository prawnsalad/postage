<script setup lang="ts">
import { ref, reactive } from 'vue';
import InlineSvg from 'vue-inline-svg';

const props = defineProps<{
    userSettings: any,
    state: any,
    account: any,
    labels: any,
}>();

const emit = defineEmits([
    'close',
]);

const avialableLayouts = ['splith', 'splitv', 'splitnone'];

</script>

<template>
  <section class="flex flex-col p-4">
    <header>
        <span class="text-2xl">Settings</span>
        <button @click="$router.go(-1)" class="float-right"><inline-svg src="/svg/delete.svg" /></button>
    </header>

    <div>
        <label>
            Split message panes:
            <select v-model="userSettings.ui.mailLayout">
                <option v-for="l in avialableLayouts" :key="l" :value="l">{{l}}</option>
            </select>
        </label>
    </div>
  </section>
</template>

<style scoped>

</style>
