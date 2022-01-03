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

const newLabel = reactive({
    show: false,
    name: '',
});
const editingLabel = reactive({
    id: null,
    name: '',
    filter: ''
});
function limitInputCharacters(re:RegExp, event) {
    // Always allow enter as it's used for submitting forms
    if (event.keyCode === 13) return;

    let char = String.fromCharCode(event.keyCode);
    if (char.match(re)) {
        return;
    }

    event.preventDefault();
}
async function saveNewLabel() {
    if (!newLabel.name.trim()) {
        return;
    }

    let api = AppInstance.instance().api;
    let ret = await api.call('labels.add', newLabel.name, {filter: ''});

    // TODO: Move this updating somewhere else
    let [err, labels] = await api.call('labels.get');
    props.labels.value = labels;

    newLabel.show = false;
    newLabel.name = '';
}

async function deleteLabel(label) {
    let api = AppInstance.instance().api;
    if (!confirm(`Really delete label ${label.name}?`)) {
        return;
    }

    let [deleteErr] = await api.call('labels.delete', label.id);

    // TODO: Move this updating somewhere else
    let [err, labels] = await api.call('labels.get');
    props.labels.value = labels;
}

function editLabel(label) {
    editingLabel.id = label.id;
    editingLabel.filter = label.filter;
    editingLabel.name = label.name;
}
async function saveLabel() {
    if (!editingLabel.name.trim()) {
        return;
    }

    let api = AppInstance.instance().api;
    let ret = await api.call('labels.update', editingLabel.id, {
        name: editingLabel.name,
        filter: editingLabel.filter,
    });

    // TODO: Move this updating somewhere else
    let [err, labels] = await api.call('labels.get');
    props.labels.value = labels;

    editingLabel.id = null;
    editingLabel.name = '';
    editingLabel.filter = '';
}
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
    <source-settings></source-settings>
  </main>
</template>

<style scoped>

main > section {
    @apply mt-8;
}
</style>
