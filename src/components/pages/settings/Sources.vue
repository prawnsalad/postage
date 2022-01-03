<script setup lang="ts">
import { ref, reactive } from 'vue';
import AppInstance from '@/services/AppInstance';
import InlineSvg from 'vue-inline-svg';

interface ISource {
    id: string,
    name: string,
    type: string,
    host: string,
    port: number,
    tls: boolean,
    authUser: string,
    authPass: string,
}

const sources = ref<ISource[]>([]);
async function refreshSources() {
    let api = AppInstance.instance().api;
    let [err, apiSources] = await api.call('source.get');
    sources.value = apiSources;
}
refreshSources();

const showNewSource = ref(false);
const newSource = reactive<ISource>({
    id: '',
    name: '',
    type: 'imap',
    host: '',
    port: 993,
    tls: true,
    authUser: '',
    authPass: '',
});

const editingSource = reactive<ISource>({
    id: '',
    name: '',
    type: '',
    host: '',
    port: 993,
    tls: true,
    authUser: '',
    authPass: '',
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

async function saveNewSource() {
    if (!newSource.name.trim()) {
        return;
    }

    let api = AppInstance.instance().api;
    let [err] = await api.call('source.add', newSource.name, newSource);
    if (err) {
        console.error('Error saving source', err);
        return;
    }

    showNewSource.value = false;
    clearSourceObject(newSource);
    refreshSources();
}

async function deleteSource(source) {
    let api = AppInstance.instance().api;
    if (!confirm(`Really delete source ${source.name}?`)) {
        return;
    }

    let [deleteErr] = await api.call('source.delete', source.id);
    if (deleteErr) {
        console.error('Error deleting source', deleteErr);
        return;
    }

    refreshSources();
}

function editSource(source) {
    Object.assign(editingSource, source);
}

async function saveSource() {
    if (!editingSource.name.trim()) {
        return;
    }

    let api = AppInstance.instance().api;
    let [err, ret] = await api.call('source.update', editingSource.id, editingSource);
    if (err) {
        console.error('Error saving source', err);
        return;
    }

    clearSourceObject(editingSource);
    refreshSources();
}


function clearSourceObject(dest) {
    Object.assign(dest, {
        id: '',
        name: '',
        type: 'imap',
        host: '',
        port: 993,
        tls: true,
        authUser: '',
        authPass: '',
    });
}
</script>

<template>
    <section>
        <h4 class="font-bold">Message sources</h4>

        <div class="grid grid-cols-4 gap-x-4 sources-wrap">
            <div v-if="!showNewSource" class="col-span-4">
                <button @click="showNewSource=true" class="button-sub">New source</button>
            </div>
            <form v-else @submit.prevent="saveNewSource" class="col-span-4 border-dashed border border-neutral-400 p-4 my-4 whitespace-nowrap">
                <input
                    v-model="newSource.name"
                    v-focus
                    class="mr-8"
                    placeholder="New source name.."
                    maxlength="20"
                >

                <div class="block mt-2">
                    <span class="block">IMAP server</span>

                    <label class="inline-block">
                        Host: <input v-model="newSource.host" />
                    </label>
                    <label class="inline-block ml-4">
                        Port: <input v-model.number="newSource.port" type="number" class="w-28" />
                    </label>
                    <br>
                    <label class="inline-block mt-2">
                        Secure connection <input v-model="newSource.tls" type="checkbox" />
                    </label>

                    <label class="block mt-2">
                        Username <br>
                        <input v-model="newSource.authUser" />
                    </label>
                    <label class="block mt-2">
                        Password <br>
                        <input v-model="newSource.authPass" />
                    </label>
                </div>

                <button type="submit" class="mr-4">Save</button>
                <button @click="showNewSource=false" class="button-sub">Cancel</button>
            </form>

            <template v-for="source in sources">
                <div>{{source.name}}</div>
                <div class="text-neutral-400">{{source.type}}</div>
                <div class="text-neutral-400">{{source.tls?'tls://':''}}{{source.host}}:{{source.port}}</div>
                <div>
                    <button class="button-sub mr-4" @click="editSource(source)">edit</button>
                    <button class="button-sub" @click="deleteSource(source)">delete</button>
                </div>
                <form
                    v-if="editingSource.id === source.id"
                    @submit.prevent="saveSource"
                    class="col-span-4 border-dashed border border-neutral-400 p-4 my-4"
                >
                    <label class="block">
                        Name <br>
                        <input v-model="editingSource.name" v-focus />
                    </label>
                    <div class="block mt-2">
                        <span class="block">IMAP server</span>

                        <label class="inline-block">
                            Host: <input v-model="editingSource.host" />
                        </label>
                        <label class="inline-block ml-4">
                            Port: <input v-model.number="editingSource.port" type="number" class="w-28" />
                        </label>
                        <br>
                        <label class="inline-block mt-2">
                            Secure connection <input v-model="editingSource.tls" type="checkbox" />
                        </label>

                        <label class="block mt-2">
                            Username <br>
                            <input v-model="editingSource.authUser" />
                        </label>
                        <label class="block mt-2">
                            Password <br>
                            <input v-model="editingSource.authPass" />
                        </label>
                    </div>

                    <div class="mt-4">
                        <button type="submit" class="mr-4">Save</button>
                        <button @click="editingSource.id=''" class="button-sub">Cancel</button>
                    </div>
                </form>
            </template>
        </div>
    </section>
</template>

<style scoped>
.sources-wrap {
    max-inline-size: max-content;
}
</style>
