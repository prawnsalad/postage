<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import DOMPurify from 'dompurify';
import InlineSvg from 'vue-inline-svg';
import { fullDate } from '@/libs/Dates';
import { splitAddr } from '@/libs/Misc';
import Avatar from '@/components/Avatar.vue';
import type { IMessage } from '@/types/common';

const props = defineProps<{
    message: IMessage,
    defaultcollapsed?: boolean,
    canReply?: boolean,
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

  // set all elements owning target to target=_blank
  if ('target' in currentNode) {
    currentNode.setAttribute('target', '_blank');
  }
  // set non-HTML/MathML links to xlink:show=new
  if (
    !currentNode.hasAttribute('target') &&
    (currentNode.hasAttribute('xlink:href') || currentNode.hasAttribute('href'))
  ) {
    currentNode.setAttribute('xlink:show', 'new');
  }

  return currentNode;
});

const bodyType = computed(() => {
  if (props.message.bodyHtml) {
    return 'html';
  } else {
    return 'text';
  }
});

const cleanMessageHtml = computed(() => {
  let ret = '';
  try {
    ret = DOMPurify.sanitize(props.message.bodyHtml, {USE_PROFILES: {html: true}});
  } catch(err) {
    console.error(err);
    ret = '[Error parsing HTML email]';
  }
  return ret;
});

</script>

<template>
  <article class="flex">
    <avatar v-if="options.avatars" :name="message.from"></avatar>

    <div class="ml-4 flex-grow">
      <div class="flex">
        <div class="flex-grow">
          <span class="font-bold mr-2">{{splitAddr(message.from).display}}</span>
          <span class="text-neutral-500 text-sm">{{splitAddr(message.from).address}}</span>
        </div>
        <div class="text-neutral-400 text-sm whitespace-nowrap" :title="fullDate(message.recieved, {year:true})">{{ fullDate(message.recieved) }}</div>
      </div>

      <div v-if="!collapsed" class="flex text-sm gap-4">
        <div class="flex-grow text-neutral-500 min-w-0">
          <div class="text-neutral-500 overflow-ellipsis overflow-hidden whitespace-nowrap">
            <span v-if="message.to.length">To: {{message.to.map(a=>splitAddr(a).display).join(',')}}. </span>
            <span v-if="message.cc.length">Cc: {{message.cc.map(a=>splitAddr(a).display).join(',')}}. </span>
            <span v-if="message.bcc.length">Bcc: {{message.bcc.map(a=>splitAddr(a).display).join(',')}}. </span>
          </div>
        </div>
        <div class="flex-shrink-0">
          <div class="message-more-actions hidden">
            <button v-if="canReply" @click="emit('replyall')" unstyled class="mr-2"><inline-svg src="/svg/replyall.svg" class="inline" /></button>
            <button v-if="canReply" @click="emit('reply')" unstyled class="mr-2"><inline-svg src="/svg/reply.svg" class="inline" /></button>
          </div>
          <span class="star inline-block mr-2"></span>
          <inline-svg src="/svg/vmenu.svg" class="message-more-actions-icon inline" />
        </div>
      </div>

      <div v-if="!collapsed" class="mt-4 text-lg">
        <div v-if="bodyType === 'html'" v-html="cleanMessageHtml" class="overflow-hidden"></div>
        <div v-else class="whitespace-pre-wrap">{{message.bodyText}}</div>
      </div>
      <div v-else @click="collapsedToggle=!collapsedToggle" class="text-neutral-400 text-lg cursor-pointer">
        {{message.bodyText.replace(/\n/g, ' ')}}
      </div>
    </div>
  </article>
</template>

<style scoped>

article:hover .message-more-actions {
  display: inline-block;
}
article:hover .message-more-actions-icon {
  display: none;
}

.star {
    border: 2px solid gold;
    height: 10px;
    width: 10px;
}

</style>
