<script setup lang="ts">

import { ref, reactive, watchEffect, markRaw } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import AppInstance from '@/services/AppInstance';
import Logo from '@/components/Logo.vue';
import LabelList from '@/components/LabelList.vue'
import ComposeMail from '@/components/compose/Compose.vue'
import Utilities from '@/components/Utilities.vue'
import Search from '@/components/search/Search.vue';
import userSettings from '@/libs/UserSettings';
import { ILabel } from '@/types/common';

const router = useRouter();
const route = useRoute();

const labels = ref<ILabel[]>([]);

const state = reactive<{
  activeLabel: ILabel | null,
  activeThreadId: string,
  queryStr: string,
}>({
  activeLabel: null,
  activeThreadId: '',
  queryStr: '',
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

const pageProps = markRaw({
    state: state,
    userSettings: userSettings,
    account: account,
    labels: labels,
});



// Calling this sets the address in the router which in return triggers the watch below
function openLabel(label: ILabel) {
  let name = labelNameToUrlForm(label.name);
  router.push({
    name: 'messages',
    params: {
      labels: name,
    }
  });
}

function labelNameToUrlForm(labelName: string) {
  // eg. Changes "Custom Label" to customlabel. Safe but also human readable is important. We can
  //     pretend that "Custom Label" and "CustomLabel" labels conflict doesn't exist as the issue
  //     that arises will be obvious to the user. Also, can check for that when creating the label.
  return labelName.replace(/ /g, '').toLowerCase();
}

// Update the active label/thread/search based on the URL
watchEffect(() => {
  let currentLabelName = labelNameToUrlForm(route.params.labels as string || '');
  let label = labels.value.find(l => labelNameToUrlForm(l.name) === currentLabelName);
  if (label) {
    state.activeLabel = label;
  }

  let newThreadId = (route.params.threadid as string) || '';
  state.activeThreadId = atob(newThreadId);

  state.queryStr = (route.query.q as string) || '';
});


function onSearchQuery(queryText: string, query) {
  console.log('queryText', queryText);
  console.log('query', query);
  router.push({
    name: 'messages',
    params: {
      labels: '_search',
    },
    query: {
      q: queryText,
    }
  });
}

</script>

<template>
  <div class="header-topcorner bg-neutral-300 px-4 py-2 flex gap-4 text-sm" style="grid-area:topcorner;">
    <logo :small="true" />
    <div class="flex flex-col justify-end">
      <div>{{account.user.primaryAccount}}</div>
      <div>
        <router-link :to="{name:'settings'}" class="cursor-pointer mr-4 hover:underline">Logout</router-link>
        <router-link :to="{name:'settings'}" class="cursor-pointer mr-4 hover:underline">Settings</router-link>
      </div>
    </div>
  </div>

  <div class="header-toolbar flex items-center pl-4 border-b border-neutral-200" style="grid-area:toolbar;">
    <span class="text-3xl w-32 min-w-max">{{state.activeLabel?.name}}</span>
    <div class="flex-grow">
      <search class="m-3" @query="onSearchQuery" :query="state.queryStr" />
    </div>

    <utilities />
  </div>


  <div class="sidebar px-4 pt-4 bg-neutral-100" style="grid-area:sidebar;">
    <button unstyled class="w-full py-4 mb-8 bg-primary-400" @click="showNewMail=true">New Message</button>
    <label-list @label:selected="openLabel($event)" :labels="labels" :active-label="state.activeLabel"></label-list>
  </div>

  <router-view
    v-bind="pageProps"
    style="grid-area:pagecontainer;"
  ></router-view>

  <compose-mail
    v-if="showNewMail"
    class="
      fixed bottom-0 right-0
      h-4/6 w-10/12 md:w-6/12 lg:w-4/12
      shadow-md bg-white
    "
    @close="showNewMail=false"
  />
</template>

<style>

.header-toolbar .search {
  transition: width 0.2s, opacity 0.2s;
}

</style>
