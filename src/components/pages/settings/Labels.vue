<script setup lang="ts">
import { ref, reactive } from 'vue';
import AppInstance from '@/services/AppInstance';
import InlineSvg from 'vue-inline-svg';

const props = defineProps<{
    labels: any,
}>();

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
    <section>
        <h4 class="font-bold">Labels</h4>

        <div class="grid grid-cols-4 gap-x-4 labels-wrap">
            <div v-if="!newLabel.show" class="col-span-4">
                <button @click="newLabel.show=true" class="button-sub">New label</button>
            </div>
            <form v-else @submit.prevent="saveNewLabel" class="col-span-4 border-dashed border border-neutral-400 p-4 my-4 whitespace-nowrap">
                <input
                    v-model="newLabel.name"
                    v-focus
                    class="mr-8"
                    placeholder="New label name.."
                    maxlength="20"
                >
                <button type="submit" class="mr-4">Save</button>
                <button @click="newLabel.show=false" class="button-sub">Cancel</button>
            </form>

            <template v-for="label in labels.value">
                <div>{{label.name}}</div>
                <div class="text-neutral-400">{{label.unread}} unread</div>
                <div class="text-neutral-400">{{label.filter}}</div>
                <div>
                    <button class="button-sub mr-4" @click="editLabel(label)">edit</button>
                    <button class="button-sub" @click="deleteLabel(label)">delete</button>
                </div>
                <form
                    v-if="editingLabel.id === label.id"
                    @submit.prevent="saveLabel"
                    class="col-span-4 border-dashed border border-neutral-400 p-4 my-4"
                >
                    <label class="block">
                        Name <br>
                        <input v-model="editingLabel.name" />
                    </label>
                    <label class="block mt-2">
                        Apply the label if it matches this search: <br>
                        <input v-model="editingLabel.filter" />
                    </label>

                    <div class="mt-4">
                        <button type="submit" class="mr-4">Save</button>
                        <button @click="editingLabel.id=null" class="button-sub">Cancel</button>
                    </div>
                </form>
            </template>
        </div>
    </section>
</template>

<style scoped>
.labels-wrap {
    max-inline-size: max-content;
}
</style>
