<script setup lang="ts">

import { ref, reactive, computed } from 'vue'
import InlineSvg from 'vue-inline-svg';

import AppInstance from '@/services/AppInstance';
import Logo from '@/components/Logo.vue';
import LabelList from '@/components/LabelList.vue'
import Messages from '@/components/Messages.vue'
import MessageThread from '@/components/thread/index.vue'
import ComposeMail from '@/components/Compose.vue'
import Utilities from '@/components/Utilities.vue'
import { ILabel, IMessage } from '@/types/common';

const userSettings = reactive({
  ui: {
    mailLayout: 'splith', // splith, splitv, splitnone
    maillistSize: 350,
  },
});

const avialableLayouts = ['splith', 'splitv', 'splitnone'];

const labels = ref<ILabel[]>([]);

const state = reactive<{
  activeLabel: ILabel | null,
  activeThreadId: string,
}>({
  activeLabel: null,
  activeThreadId: '',
});

const showNewMail = ref(false);

// When stuff updates in our account (labels, account config, user info, etc), update our states
const account = AppInstance.instance().account;
account.getLabels().then(newLabels => {
  labels.value = newLabels;

  if (!state.activeLabel) {
    state.activeLabel = labels.value[0];
  }
});

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
  <div class="header-topcorner bg-neutral-300 px-4 py-2 flex gap-4 text-sm" style="grid-area:topcorner;">
    <logo :small="true" />
    <div class="flex flex-col justify-end">
      <div>{{account.user.primaryAccount}}</div>
      <div><a href="#">Logout</a> <a href="#">Settings</a></div>
    </div>
  </div>

  <div class="header-toolbar flex items-center pl-4 border-b border-neutral-200" style="grid-area:toolbar;">
    <span class="text-3xl w-32 min-w-max">{{state.activeLabel?.name}}</span>
    <div class="flex-grow">
      <input
        type="text"
        class="
          search
          p-2 m-3
          w-60
          opacity-60
          border border-neutral-300
          rounded
          hover:opacity-100 hover:w-80
          focus:opacity-100 focus:w-80
        "
        placeholder="Search messages"
      />
    </div>

    <label>
      <select v-model="userSettings.ui.mailLayout">
        <option v-for="l in avialableLayouts" :key="l" :value="l">{{l}}</option>
      </select>
    </label>

    <utilities />
  </div>


  <div class="sidebar px-4 pt-4 bg-neutral-100" style="grid-area:sidebar;">
    <button class="w-full py-4 mb-8 bg-primary-400" @click="showNewMail=true">New Message</button>
    <label-list @label:selected="state.activeLabel=$event" :labels="labels" :active-label="state.activeLabel"></label-list>
  </div>

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

  <compose-mail
    v-if="showNewMail"
    class="
      fixed bottom-0 right-0
      h-4/6 w-10/12 md:w-6/12 lg:w-4/12
      shadow-md
      border border-neutral-400 bg-white
    "
    @close="showNewMail=false"
  />
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



.header-toolbar .search {
  transition: width 0.2s, opacity 0.2s;
}

</style>
