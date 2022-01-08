<script setup lang="ts">
import { ref, reactive } from 'vue';
import AppInstance from '@/services/AppInstance';
import LabelSettings from './Labels.vue';
import SourceSettings from './Sources.vue';
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

const account = AppInstance.instance().account;

</script>

<template>
  <main class="flex flex-col p-4">
    <header class="flex">
        <h3 class="text-2xl flex-grow">Settings</h3>
        <button unstyled @click="$router.go(-1)"><inline-svg src="/svg/delete.svg" /></button>
    </header>

    <section>
        <label>
            <div class="font-bold">Split message panes</div>
            <select v-model="userSettings.ui.mailLayout">
                <option v-for="l in avialableLayouts" :key="l" :value="l">{{l}}</option>
            </select>
        </label>
    </section>

    <section>
        <h4 class="font-bold">Time format</h4>
        <label>
            12 hour (1:30 pm) <input v-model="userSettings.hourFormat" type="radio" :value="12">
        </label> <br>
        <label>
            24 hour (13:30) <input v-model="userSettings.hourFormat" type="radio" :value="24">
        </label>
    </section>

    <label-settings :labels="labels"></label-settings>
    <source-settings v-if="account.policy('sources.show')"></source-settings>
  </main>
</template>

<style scoped>

main > section {
    @apply mt-8;
}
</style>
