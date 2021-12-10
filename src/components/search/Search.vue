<script setup lang="ts">

import { ref, watchEffect, computed } from 'vue';
import _ from 'lodash';
import { IQueryTag, parseQuery } from '@/libs/TextQueryParser';
import TagPreview from './TagPreview.vue';

const emit = defineEmits([
    'query',
]);

const input = ref('');
const query = ref<IQueryTag[]>([]);
const showOptions = ref(false);

watchEffect(() => {
    try {
        let parsed = parseQuery(input.value);
        query.value = parsed;
    } catch (err) {
        console.log('Error parsing query', err);
    }
});

const queryParts = computed(() => {
    let ret = {
        labels: <IQueryTag[]>[],
        contains: <IQueryTag[]>[],
        excludes: <IQueryTag[]>[],
        from: <IQueryTag[]>[],
        to: <IQueryTag[]>[],
        cc: <IQueryTag[]>[],
        bcc: <IQueryTag[]>[],
        has: <IQueryTag[]>[],
    };

    for (let tag of query.value) {
        if (tag.tag === 'label') ret.labels.push(tag);
        if (tag.tag === 'term' && tag.exclude) ret.excludes.push(tag);
        if (tag.tag === 'term' && !tag.exclude) ret.contains.push(tag);
        if (tag.tag === 'from') ret.from.push(tag);
        if (tag.tag === 'to') ret.to.push(tag);
        if (tag.tag === 'cc') ret.cc.push(tag);
        if (tag.tag === 'bcc') ret.bcc.push(tag);
        if (tag.tag === 'has') ret.has.push(tag);
    }

    return ret;
});

function tagsAsText(tags: IQueryTag[]) {
    let out = '';

    for (let tag of tags) {
        if (!tag.value.trim()) continue;

        out += tag.value.includes(' ') ?
            `"${tag.value}" ` :
            `${tag.value} `;
    }

    return out.trim();
}


</script>

<template>
    <div class="relative">
        <input
            type="text"
            v-model="input"
            class="
                search
                p-2
                w-60
                opacity-60
                border border-neutral-300
                rounded
                hover:opacity-100 hover:w-80
                focus:opacity-100 focus:w-80
            "
            placeholder="Search messages"
            @focus="showOptions=true"
            @blur="showOptions=false"
            @keypress.enter="emit('query', input, query)"
        />

        <div
            v-if="showOptions"
            class="absolute left-0 right-0 p-2 text-sm bg-white grid gap-x-4 shadow-md"
            style="grid-template-columns:min-content 1fr; line-height:1.8em;"
        >

                <span>Contains:</span> <span><tag-preview :value="tagsAsText(queryParts.contains)"></tag-preview></span>
                <span>Exclude:</span> <span><tag-preview :value="tagsAsText(queryParts.excludes)">-exclude</tag-preview></span>
                <span>Labels:</span> <span><tag-preview :value="tagsAsText(queryParts.labels)">label:inbox</tag-preview></span>
                <span>From:</span> <span><tag-preview :value="tagsAsText(queryParts.from)">from:darren@example.com</tag-preview></span>
                <span>To:</span> <span><tag-preview :value="tagsAsText(queryParts.to)">to:darren@example.com</tag-preview></span>
                <span>Cc:</span> <span><tag-preview :value="tagsAsText(queryParts.cc)">cc:darren@example.com</tag-preview></span>
                <span>Bcc:</span> <span><tag-preview :value="tagsAsText(queryParts.bcc)">bcc:darren@example.com</tag-preview></span>

                <span></span> <span><input type="checkbox" disabled :checked="!!queryParts.has.find(t=>t.value==='attachment')" /> Has attachment</span>
        </div>
    </div>
</template>

<style scoped>
</style>