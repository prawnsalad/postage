<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import _ from 'lodash';
import InlineSvg from 'vue-inline-svg';
import Message from './Message.vue';
import { getThread } from '@/services/MessageLoader';
import Account from '@/services/Account';
import Avatar from '@/components/Avatar.vue';
import Compose from '@/components/compose/Compose.vue';

import type { IMessage, ILabel } from '@/types/common';

const props = defineProps<{
    messages?: Array<IMessage>,
    threadId?: string,
    labels?: Array<ILabel>,
    account: Account,
}>();

const messages = ref<IMessage[]>([]);
async function updateThread() {
    if (props.messages) {
        messages.value = props.messages;
    } else if (props.threadId) {
        let res = await getThread(props.threadId);
        // TODO: Can we use the res.collection message loader directly instead?
        messages.value = [...res.collection.map(m => m.src)];
    }
}

updateThread();
watch(() => props.messages + props.threadId, updateThread);

const showCompose = ref(false);
const replyTemplate = ref<IMessage>({
    id: '',
    threadId: '',
    from: '',
    to: [],
    cc: [],
    bcc: [],
    subject: '',
    bodyText: '',
    bodyHtml: '',
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
        bodyText: '',
        bodyHtml: '',
        labels: []
    };
    showCompose.value = true;
}

const threadInfo = computed(() => {
    let labelsMap: {[key: string]: ILabel} = {};
    (props.labels || []).forEach(l => labelsMap[l.id] = l);

    let labels:Array<ILabel> = [];
    for (let labelId of _.uniqBy(messages.value.map(m => m.labels), 'id')) {
        if (labelsMap[labelId]) {
            labels.push(labelsMap[labelId]);
        }
    }

    return {
        topic: messages.value[0]?.subject,
        threadId: messages.value[0]?.threadId,
        labels: labels,
    };
});

</script>

<template>
  <section class="message-thread">
      <header class="mb-4">
        <div class="text-2xl font-bold">{{threadInfo.topic}}</div>
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
