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
        <div>
            <label>
                Split message panes: <br>
                <select v-model="userSettings.ui.mailLayout">
                    <option v-for="l in avialableLayouts" :key="l" :value="l">{{l}}</option>
                </select>
            </label>
        </div>

        <div class="mt-8">
            Time format: <br>
            <label>
                12 hour (1:30 pm) <input v-model="userSettings.hourFormat" type="radio" :value="12">
            </label> <br>
            <label>
                24 hour (13:30) <input v-model="userSettings.hourFormat" type="radio" :value="24">
            </label>
        </div>
    </div>
  </section>
</template>

<style scoped>

</style>
