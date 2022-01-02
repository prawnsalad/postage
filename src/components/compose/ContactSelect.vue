<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { IContact } from '@/types/common';
import AppInstance from '@/services/AppInstance';

const props = defineProps<{
  contact?: IContact,
  inputId?: string,
}>();

const emit = defineEmits([
    'input',
    'select',
]);

const contacts = ref(AppInstance.instance().contacts.get());
const filter = ref('');
const filteredContacts = computed(() => {
    if (!filter.value) {
        return [];
    }

    return contacts.value.filter(c => c.name.includes(filter.value) || c.emails.find(e => e.includes(filter.value)));
});


// Drop down list selection
const selectedIdx = ref(0);
watch(selectedIdx, () => {
    emit('input', filteredContacts.value[selectedIdx.value]);
});
watch(filter, () => {
    selectedIdx.value = 0;
});
function selectPrev() {
    if (selectedIdx.value > 0) {
        selectedIdx.value--;
    }
}
function selectNext() {
    if (selectedIdx.value < filteredContacts.value.length - 1) {
        selectedIdx.value++;
    } else {
        selectedIdx.value = filteredContacts.value.length - 1;
    }
}
function selectCurrent() {
    // If we don't have a current selection, use the raw typed in email
    let contact = filteredContacts.value[selectedIdx.value];
    if (!contact && filter.value.trim()) {
        contact = {
            name: '',
            emails: [filter.value.trim()],
            label: '',
        };
    }
    if (contact) {
        emit('select', contact);
        filter.value = '';
    }
}


</script>

<template>
  <div>
      <input
        :id="props.inputId || ''"
        type="text"
        v-model="filter"
        unstyled
        class="outline-none w-full"
        @keydown.down.prevent="selectNext"
        @keydown.up.prevent="selectPrev"
        @keydown.enter.prevent="selectCurrent"
        @blur="selectCurrent"
      />

      <ul v-if="filteredContacts.length > 0" class="absolute bg-white border border-neutral-400 border-b-0">
          <li
            v-for="(contact, contactIdx) in filteredContacts"
            :key="contact.name"
            class="flex px-2 py-2 border-b border-neutral-400 select-none"
            :class="{
                'bg-neutral-200': contactIdx === selectedIdx,
                'hover:bg-neutral-100': contactIdx !== selectedIdx,
            }"
            @click="selectCurrent"
        >
              <div>(A)</div>
              <div class="flex-grow">
                  <div>{{contact.name}}</div>
                  <div class="text-sm">{{contact.emails[0]}}</div>
              </div>
          </li>
      </ul>
  </div>
</template>

<style scoped>

.meta > div {
    border-bottom: 1px solid lightgray;
}

.contact-label {
    @apply ml-3 whitespace-nowrap text-sm border border-neutral-300 rounded px-1;
}

</style>
