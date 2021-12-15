<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import DOMPurify from 'dompurify';
import InlineSvg from 'vue-inline-svg';
import { fullDate } from '@/libs/Dates';
import Avatar from '@/components/Avatar.vue';
import type { IMessage } from '@/types/common';

const props = defineProps<{
    message: IMessage,
    defaultcollapsed?: boolean,
}>()

const emit = defineEmits([
    'close',
    'reply',
    'replyall',
]);

const options = reactive({
    avatars: true,
});

const collapsedToggle = ref(!!props.defaultcollapsed);
const collapsed = computed(() => {
  // Never collapse unread messages
  if (!props.message.read) {
    return false;
  }

  return collapsedToggle.value;
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
        <div class="flex-grow">{{message.from}}</div>
        <div class="text-sm text-neutral-400">{{ fullDate(message.recieved) }}</div>
      </div>

      <div v-if="!collapsed" class="flex text-sm">
        <div class="flex-grow text-neutral-500">To: {{message.to.join(',')}}. Cc: some other</div>
        <div>
          <div class="message-more-actions inline-block hidden">
            <button @click="emit('replyall')" class="mr-2"><inline-svg src="/svg/replyall.svg" class="inline" /></button>
            <button @click="emit('reply')" class="mr-2"><inline-svg src="/svg/reply.svg" class="inline" /></button>
          </div>
          <span class="star inline-block mr-2"></span>
          <inline-svg src="/svg/vmenu.svg" class="inline" />
        </div>
      </div>

      <div v-if="!collapsed" class="mt-4">
        <div v-html="cleanMessageHtml" class="overflow-hidden"></div>
      </div>
      <div v-else @click="collapsedToggle=!collapsedToggle" class="text-neutral-400 cursor-pointer">
        {{message.bodyText.replace(/\n/g, ' ')}}
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
