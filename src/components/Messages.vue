<script setup lang="ts">
import { ref, reactive } from 'vue';
import Avatar from './Avatar.vue';
import { getMessages } from '@/services/MessageLoader';
import type { IMessageLoader, IMessage, ILabel } from '@/types/common';

const props = defineProps<{
  labels: Array<ILabel>,
  activeLabel: ILabel,
}>();



const messages = ref<Array<IMessageLoader>>([]);


let res = getMessages([
    0,1,2,3,4,5, //6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,
    100, 101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,121,122,123,124,125,126,127,128,129,130,
]);

// Each stage of the message loading can give us different loaded messages, so as each stage
// completes we can reload the messages here to render then as soon as they arrive.
// Awaiting Promise.allSettled(res.promises) would wait until everything has completed
// A stage = loading from the local cache or loading from the server
res.promises.forEach(async p => {
    await p;
    messages.value = [...res.collection];
});

const options = reactive({
    avatars: true,
});

// Only show the labels for the non-active label on messages in the list
function filteredLabels(msgLabels: Array<number>): Array<ILabel> {
    let labelsMap = {};
    props.labels.forEach(l => labelsMap[l.id] = l);

    let activeLabelName = props.activeLabel?.name.toLowerCase();

    let ret: Array<ILabel> = [];
    for (let labelId of msgLabels) {
        let label = labelsMap[labelId];
        // The label might not exist if it's been deleted
        if (!label) {
            continue;
        }

        if (label.name.toLowerCase() !== activeLabelName) {
            continue;
        }

        if (!labelsMap[label.id]) {
            continue;
        }

        ret.push(label);
    }

    return ret;
}

</script>

<template>
  <div class="messages flex flex-col overflow-hidden">
    <div class="text-sm p-2 shadow">
        <input type="checkbox" class="m-0" />
        Some tools here
        <span class="pagination">&lt; 1-50 of 5,000 &gt;</span>
    </div>
    <div class="flex-grow overflow-y-auto">
        <div
            v-for="m in messages"
            :key="m.id"
            class="
                flex p-2
                children:ml-4 children:first:ml-0
                border-b border-neutral-200
            "
            @click="$emit('message:selected', m.src)"
        >
            <div class="flex flex-col justify-center">
                <input type="checkbox" class="m-0" />
            </div>

            <template v-if="m.state === 'loaded'">
                <avatar v-if="options.avatars" :name="m.src.from"></avatar>
                <div class="flex-grow whitespace-nowrap overflow-hidden overflow-ellipsis">
                    <div class="info-top">
                        <span class="font-bold">{{m.src.from || m.src.from}}</span>
                        <div class="inline-block ml-4 text-sm">
                            <span class="star inline-block"></span>
                            <span
                                v-for="l in filteredLabels(m.src.labels || [])"
                                :key="l.id"
                                class="ml-2 p-1 bg-neutral-100 rounded"
                            >{{l.name}}</span>
                        </div>
                    </div>
                    <div class="topic whitespace-nowrap">{{m.src.subject}}</div>
                </div>

                <div>
                    <span class="text-sm float-right text-neutral-400">00:00:00</span>
                </div>
            </template>
            <template v-else>
                Loading... {{m.state}}
            </template>
        </div>
    </div>
  </div>
</template>

<style scoped>

.star {
    border: 2px solid gold;
    height: 10px;
    width: 10px;
}


</style>
