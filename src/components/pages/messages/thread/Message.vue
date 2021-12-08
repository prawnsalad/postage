<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import DOMPurify from 'dompurify';
import InlineSvg from 'vue-inline-svg';
import Avatar from '@/components/Avatar.vue';
import type { IMessage } from '@/types/common';

const props = defineProps<{
    message: IMessage
}>()

const emit = defineEmits([
    'close',
]);

const options = reactive({
    avatars: true,
});


DOMPurify.addHook('afterSanitizeAttributes', (currentNode, hookEvent, config) => {
  if (currentNode.id) {
    currentNode.id = '';
  }
  if (currentNode.className) {
    currentNode.className = '';
  }
  if (currentNode.style.position) {
    currentNode.style.position = '';
  }
  return currentNode;
});

const cleanMessageHtml = computed(() => {
  let ret = '';
  if (props.message.bodyHtml) {
    try {
      ret = DOMPurify.sanitize(props.message.bodyHtml, {USE_PROFILES: {html: true}});
    } catch(err) {
      console.error(err);
      ret = '[Error parsing HTML email]';
    }
  } else {
    ret = props.message.bodyText;
  }

  return ret;
});

</script>

<template>
  <article class="flex">
    <avatar v-if="options.avatars" :name="message.from"></avatar>

    <div class="ml-4 flex-grow">
      <div class="flex">
        <div class="flex-grow font-bold">{{message.from}}</div>
        <div class="text-sm text-neutral-400">No 3, 2021, 8:47 PM</div>
      </div>

      <div class="flex text-sm">
        <div class="flex-grow text-neutral-500">To: {{message.to.join(',')}}. Cc: some other</div>
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
        <div v-html="cleanMessageHtml" class="overflow-hidden"></div>
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
