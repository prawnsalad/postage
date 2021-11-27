<script setup lang="ts">
import { ref, computed } from 'vue';
import _ from 'lodash';
import InlineSvg from 'vue-inline-svg';
import Message from './Message.vue';
import Account from '@/services/account';
import Avatar from '@/components/Avatar.vue';
import Compose from '@/components/Compose.vue';

import type { IMessage, ILabel } from '@/types/common';

const props = defineProps<{
    messages: Array<IMessage>,
    labels?: Array<ILabel>,
    account: Account,
}>();

const showCompose = ref(false);
const replyTemplate = ref<IMessage>({
    id: '',
    threadId: '',
    from: '',
    to: [],
    cc: [],
    bcc: [],
    subject: '',
    body: '',
    labels: []
});

function startReply(replyToMessage: IMessage) {
    let m = replyToMessage;
    replyTemplate.value = {
        id: '',
        threadId: m.threadId,
        from: '',
        to: [...m.to],
        cc: [],
        bcc: [],
        subject: m.subject,
        body: '',
        labels: []
    };
    showCompose.value = true;
}

/*
    id: i,
    threadId: i, // thread IDs can just be the first message ID in the thread (can we
                    // determine a thread id on message ingestion or should it be determined
                    // in the UI with the messags it has?)
    fromEmail: 'someone@gmail.com',
    fromName: 'Some name',
    to: 'you@domain.com',
    topic: 'RE: RE: FW: help pls',
    labels: [
        labels[Math.floor(Math.random()*labels.length)],
    ],
*/
const threadInfo = computed(() => {
    let labelsMap: {[key: string]: ILabel} = {};
    (props.labels || []).forEach(l => labelsMap[l.id] = l);

    let labels:Array<ILabel> = [];
    for (let labelId of _.uniqBy(props.messages.map(m => m.labels), 'id')) {
        if (labelsMap[labelId]) {
            labels.push(labelsMap[labelId]);
        }
    }

    return {
        topic: props.messages[0]?.subject,
        threadId: props.messages[0]?.threadId,
        labels: labels,
    };
});

</script>

<template>
  <section class="message-thread">
      <header class="mb-4">
        <div class="text-lg">{{threadInfo.topic}}</div>
        <div>
            <span
                v-for="l in threadInfo.labels"
                :key="l.id"
                class="mr-2 p-1 text-sm bg-neutral-100 rounded"
            >{{l.name}}</span>
        </div>
      </header>

      <div v-for="message in messages" :key="message.id" class="border-b border-neutral-200 py-6">
        <message :message="message" />
      </div>

      <div class="mt-6 flex">
          <div class="inline-block mr-4">
              <avatar :name="account.user.name" :style="[`visibility:${showCompose?'visible':'hidden'}`]" />
          </div>
          <div class="flex-grow">
              <template v-if="!showCompose">
                  <button @click="startReply(_.last(messages))" class="border border-neutral-400 hover:border-neutral-900 text-neutral-600 py-2 px-4 mr-4"><inline-svg src="/svg/replyall.svg" class="inline" /> Reply to all</button>
                  <button class="border border-neutral-400 hover:border-neutral-900 text-neutral-600 py-2 px-4 mr-4"><inline-svg src="/svg/forward.svg" class="inline" /> Forward</button>
              </template>

                <compose
                    v-else
                    @close="showCompose=false"
                    :options="{showHeader:false, showTopic:false, focus:'body'}"
                    :message="replyTemplate"
                />
          </div>
      </div>
  </section>
</template>

<style scoped>

</style>
