<script setup>

import { ref, reactive, computed } from 'vue'

import Account from '@/services/account';
import LabelList from './components/LabelList.vue'
import Messages from './components/Messages.vue'
import MessagePreview from './components/MessagePreview.vue'
import ComposeMail from './components/Compose.vue'

const userSettings = reactive({
  ui: {
    mailLayout: 'splith', // splith, splitv, splitnone
    maillistSize: 350,
  },
});

const avialableLayouts = ['splith', 'splitv', 'splitnone'];

const labels = ref([]);

const state = reactive({
  activeLabel: null,
  activeMessage: null,
});

const showNewMail = ref(false);

// When stuff updates in our account (labels, account config, user info, etc), update our states
const account = new Account();
account.getLabels().then(newLabels => {
  labels.value = newLabels;

  if (!state.activeLabel) {
    state.activeLabel = labels.value[0];
  }
});

// Resizing the message list / preview
const elResizer = ref(null);
const resizeCursorType = computed(() => {
  return userSettings.ui.mailLayout === 'splitv' ?
    'ew-resize':
    'ns-resize';
});
let initialSize = 0;
let startPos = 0;
function onResize(event) {
  let newSize = 0;
  if (userSettings.ui.mailLayout === 'splitv') {
    newSize = initialSize + (event.clientX - startPos);
  } else {
    newSize = initialSize + (event.clientY - startPos);
  }

  if (newSize > 300) {
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
  <div class="header-topcorner bg-neutral-300 px-4">
    (M) Mail
  </div>

  <div class="header-toolbar pl-4 border-b border-neutral-200">
    <span class="inline-block text-3xl w-32 min-w-max">{{state.activeLabel?.name}}</span>
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

    <label>
      <select v-model="userSettings.ui.mailLayout">
        <option v-for="l in avialableLayouts" :key="l" :value="l">{{l}}</option>
      </select>
    </label>
  </div>


  <div class="sidebar px-4 pt-4 bg-neutral-100">
    <button class="w-full py-4 mb-8 bg-primary-400" @click="showNewMail=true">New Message</button>
    <label-list @label:selected="state.activeLabel=$event" :labels="labels" :active-label="state.activeLabel"></label-list>
  </div>

  <div
    class="mail-container"
    :class="[state.activeMessage ? userSettings.ui.mailLayout : '']"
    :style="{'--messagelist-size': userSettings.ui.maillistSize + 'px'}"
  >
    <messages @message:selected="state.activeMessage=$event" :labels="labels" :active-label="state.activeLabel"/>
    <div
      v-if="state.activeMessage"
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
    <message-preview v-if="state.activeMessage" :message="state.activeMessage" @close="state.activeMessage=null" />
  </div>
  
  <compose-mail
    v-if="showNewMail"
    class="
      fixed bottom-0 right-0
      h-4/6 w-10/12 md:w-6/12 lg:w-4/12
      shadow-md
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
  grid-template-rows: var(--messagelist-size) 5px 1fr;
  grid-template-areas:
    "messages"
    "resizer"
    "preview";
}
.mail-container.splitv {
  grid-template-columns: var(--messagelist-size) 5px 1fr;
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
.message-preview {
  grid-area: preview;
}



.header-toolbar .search {
  transition: width 0.2s, opacity 0.2s;
}

</style>
