<script setup lang="ts">
import { ref, reactive, watch, computed } from 'vue';
import Avatar from '@/components/Avatar.vue';
import { getLatest } from '@/services/MessageLoader/MessageLoader';
import { displayDate, fullDate } from '@/libs/Dates';
import type { IMessage, ILabel } from '@/types/common';

const props = defineProps<{
  labels: Array<ILabel>,
  activeLabel: ILabel | null,
  activeThreadId: string,
}>();

const messages = ref<Array<IMessage>>([]);

async function updateLatestMessages() {
    messages.value = [];
    if (props.activeLabel) {
        let res = getLatest({labelsIds: [props.activeLabel.id]});
        // TODO: Update messages.value after each individual .sources promise resolves
        await Promise.allSettled(res.sources)
        messages.value = [...res.messages]
    }
}

watch(() => props.activeLabel, updateLatestMessages);
updateLatestMessages();

interface IThreadList {
  threadId: string,
  messages: IMessage[],
}

const threadedMessages = computed(() => {
    let threads: IThreadList[] = [];
    let threadMap: {[key: string]: IThreadList} = Object.create(null);
    for (let msg of messages.value) {
        if (threadMap[msg.threadId]) {
            threadMap[msg.threadId].messages.push(msg);
        } else {
            threadMap[msg.threadId] = {
                threadId: msg.threadId,
                messages: [msg],
            };
            threads.push(threadMap[msg.threadId]);
        }
    }

    return threads;
});

function isUnread(messages: IMessage[]): boolean {
    return !!messages.find(m => m.read === 0);
}

const options = reactive({
    avatars: true,
});

// Only show the labels for the non-active label on messages in the list
function filteredLabels(msgLabels: Array<number>): Array<ILabel> {
    let labelsMap: {[key: string]: ILabel} = {};
    props.labels.forEach(l => labelsMap[l.id] = l);

    let activeLabelName = props.activeLabel?.name.toLowerCase();

    let ret: Array<ILabel> = [];
    for (let labelId of msgLabels) {
        let label = labelsMap[labelId];
        // The label might not exist if it's been deleted
        if (!label) {
            continue;
        }

        if (label.name.toLowerCase() === activeLabelName) {
            continue;
        }

        if (!labelsMap[label.id]) {
            continue;
        }

        ret.push(label);
    }

    return ret;
}

function last<T>(arr: T[]): T {
  return arr[arr.length - 1];
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
            v-for="m in threadedMessages"
            :key="m.threadId"
            class="
                flex p-2
                children:ml-4 children:first:ml-0
                border-b border-neutral-200
                select-none cursor-pointer
            "
            :class="{
                'bg-primary-100': props.activeThreadId === m.threadId,
            }"
            @click="$emit('message:selected', m.messages[0])"
        >
            <div class="flex flex-col justify-center">
                <input type="checkbox" class="m-0" />
            </div>

            <avatar v-if="options.avatars" :name="last(m.messages).from"></avatar>
            <div class="flex-grow whitespace-nowrap overflow-hidden overflow-ellipsis">
                <div class="info-top">
                    <span :class="{'font-bold': isUnread(m.messages)}">{{last(m.messages).from}}</span>
                    <div class="inline-block ml-4 text-sm">
                        <span class="star inline-block"></span>
                        <span
                            v-for="l in filteredLabels(last(m.messages).labels || [])"
                            :key="l.id"
                            class="ml-2 p-1 bg-neutral-100 rounded"
                        >{{l.name}}</span>
                    </div>
                </div>
                <div class="whitespace-nowrap">
                    <span v-if="m.messages.length > 1" class="text-xs bg-neutral-100 text-neutral-600 p-1">{{m.messages.length}}</span>
                    {{last(m.messages).subject}}
                </div>
            </div>

            <div>
                <span class="text-sm float-right text-neutral-400" :title="fullDate(last(m.messages).recieved)">
                    {{displayDate(last(m.messages).recieved)}}
                </span>
            </div>
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
