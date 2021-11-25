<script setup>
import { ref, reactive } from 'vue';
import InlineSvg from 'vue-inline-svg';
import Avatar from '@/components/Avatar.vue';

const props = defineProps({
    message: Object
})

const emit = defineEmits([
    'close',
]);

const options = reactive({
    avatars: true,
});

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
</script>

<template>
  <article class="flex">
    <avatar :name="message.fromName"></avatar>

    <div class="ml-4 flex-grow">
      <div class="flex">
        <div class="flex-grow font-bold">{{message.fromName}}</div>
        <div class="text-sm text-neutral-400">No 3, 2021, 8:47 PM</div>
      </div>

      <div class="flex text-sm">
        <div class="flex-grow text-neutral-500">To: {{message.to}}. Cc: some other</div>
        <div>
          <div class="message-more-actions inline-block hidden">
            <button class="mr-2"><inline-svg src="/svg/replyall.svg" class="inline" /></button>
            <button class="mr-2"><inline-svg src="/svg/reply.svg" class="inline" /></button>
          </div>
          <span class="star inline-block mr-2"></span>
          <inline-svg src="/svg/vmenu.svg" class="inline" />
        </div>
      </div>

      <div class="mt-4">
        This is the body!<br />{{message.body}}
      </div>
    </div>
  </article>
</template>

<style scoped>

article:hover .message-more-actions {
  display: inline-block;
}

.star {
    border: 2px solid gold;
    height: 10px;
    width: 10px;
}

</style>
