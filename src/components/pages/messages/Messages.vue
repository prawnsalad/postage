<script setup lang="ts">

import { ref, reactive, computed, markRaw } from 'vue';
import InlineSvg from 'vue-inline-svg';
import Messages from '@/components/Messages.vue';
import MessageThread from '@/components/thread/Thread.vue';

const props = defineProps<{
    userSettings: any,
    state: any,
    account: any,
    labels: any,
}>();

const userSettings = props.userSettings;
const state = props.state;
const account = props.account;
const labels = props.labels;

// Resizing the message list / preview
const elResizer = ref<HTMLElement>();
const resizeCursorType = computed(() => {
  return userSettings.ui.mailLayout === 'splitv' ?
    'ew-resize':
    'ns-resize';
});
let initialSize = 0;
let startPos = 0;
function onResize(event) {
  let newSize = 0;
  let splitLayout = userSettings.ui.mailLayout;

  if (splitLayout === 'splitv') {
    newSize = initialSize + (event.clientX - startPos);
  } else {
    newSize = initialSize + (event.clientY - startPos);
  }

  // Compare the new size to the parent element to make sure we're always within 100px of it's size
  let parentEl = elResizer.value ?
      elResizer.value.parentElement :
      null;

  if (splitLayout === 'splitv' && newSize > 300 && newSize < (parentEl?parentEl.clientWidth-100:0)) {
    userSettings.ui.maillistSize = newSize;
  } else if (splitLayout === 'splith' && newSize > 100 && newSize < (parentEl?parentEl.clientHeight-100:0)) {
    userSettings.ui.maillistSize = newSize;
  }
}
function startResizing(event) {
  document.addEventListener('mousemove', onResize, false);
  document.addEventListener('mouseup', stopResizing);
  document.body.style.userSelect = 'none';
  document.body.style.cursor = resizeCursorType.value;

  startPos = userSettings.ui.mailLayout === 'splitv' ?
    event.clientX :
    event.clientY;

  initialSize = userSettings.ui.maillistSize;
}
function stopResizing() {
  document.removeEventListener('mousemove', onResize);
  document.addEventListener('mouseup', stopResizing);
  document.body.style.userSelect = '';
  document.body.style.cursor = '';
}


</script>

<template>
  
  <div
    class="mail-container"
    :class="[state.activeThreadId ? userSettings.ui.mailLayout : '']"
    style="grid-area:mailcontainer;"
  >
    <messages
        @message:selected="state.activeThreadId=$event.threadId"
        :labels="labels"
        :active-label="state.activeLabel"
        :active-thread-id="state.activeThreadId"
    />

    <div
        v-if="state.activeThreadId"
        ref="elResizer"
        class="message-resizer border-neutral-200"
        :class="{
            'border-l': userSettings.ui.mailLayout === 'splitv',
            'border-r': userSettings.ui.mailLayout === 'splitv',
            'border-t': userSettings.ui.mailLayout === 'splith',
            'border-b': userSettings.ui.mailLayout === 'splith',
        }"
        :style="{cursor: resizeCursorType}"
        @mousedown="startResizing"
    ></div>

    <div class="message-preview overflow-y-auto px-4" v-if="state.activeThreadId">
        <div class="p-2 flex justify-end">
            <button @click="state.activeThreadId=''"><inline-svg src="/svg/delete.svg" class="" /></button>
        </div>
        <message-thread
            :key="state.activeThreadId"
            :thread-id="state.activeThreadId"
            :labels="labels"
            :account="account"
        />
    </div>
  </div>

</template>

<style>

.mail-container {
  height: 100%;
  display: grid;
  overflow: hidden;
  grid-template-areas:
    "messages";
}

.mail-container.splith {
  grid-template-rows: v-bind('userSettings.ui.maillistSize + "px"') 5px 1fr;
  grid-template-areas:
    "messages"
    "resizer"
    "preview";
}
.mail-container.splitv {
  grid-template-columns: v-bind('userSettings.ui.maillistSize + "px"') 5px 1fr;
  grid-template-areas:
    "messages resizer preview";
}
.mail-container.splitnone {
  grid-template-areas:
    "messages resizer preview";
}

.messages {
  grid-area: messages;
}
.message-resizer {
  grid-area: resizer;
}
/* shadow only needed when splith as splitv has a much more defined separation already */
.mail-container.splith .message-resizer {
  box-shadow: 0px -5px 10px 0px rgb(0 0 0 / 10%);
}
.message-preview {
  grid-area: preview;
}

</style>
