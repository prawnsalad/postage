<script setup lang="ts">
import { ref, reactive, computed, onBeforeUnmount } from 'vue';
import InlineSvg from 'vue-inline-svg';
import ContactSelect from './ContactSelect.vue';
import ColourPicker from './ColourPicker.vue';

import type { IMessage, IContact, IComposeOptions } from '@/types/common';

import { mergeAttributes } from '@tiptap/core'
import { useEditor, EditorContent, BubbleMenu, Extension } from '@tiptap/vue-3';
import StarterKit from '@tiptap/starter-kit';
import Paragraph from '@tiptap/extension-paragraph';
import TextStyle from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'

const props = defineProps({
  message: Object,
  options: Object,
});


const options: IComposeOptions = {
    showTopic: true,
    showHeader: true,
    focus: 'to',
};
Object.assign(options, props.options);

const emit = defineEmits([
    'close',
]);

const newMessage = reactive<IMessage>({
    id: '',
    threadId: '',
    labels: [],
    from: '',
    to: [],
    cc: [],
    bcc: [],
    subject: '',
    bodyText: '',
    bodyHtml: '',
});

// Any pre-set message content
if (props.message) {
    newMessage.from = props.message.from;
    newMessage.to = [...props.message.to];
    newMessage.cc = [...props.message.cc];
    newMessage.bcc = [...props.message.bcc];
    newMessage.subject = props.message.subject;
    newMessage.bodyText = props.message.bodyText;
    newMessage.bodyHtml = props.message.bodyHtml;
}

function addNewTo(contact: IContact) {
    if (contact) {
        newMessage.to.push(contact.emails[0]);
    }
}
function removeToEmail(emailIdx: number) {
    newMessage.to.splice(emailIdx, 1);
}

function addNewCc(contact: IContact) {
    if (contact) {
        newMessage.cc.push(contact.emails[0]);
    }
}
function removeCcEmail(emailIdx: number) {
    newMessage.cc.splice(emailIdx, 1);
}



function promptClose() {
    if (editor.value.getText().trim() || newMessage.subject) {
        // TODO: Just save to drafts instead. 100% chance of never loosing an email that way
        if (!confirm('Loose this message?')) {
            return;
        }
    }

    emit('close');
}

function onSendClick() {
    if (newMessage.to.length === 0) {
        alert('A recipient must be added to send the message');
        return;
    }

    let hasContent = !!editor.value.getText().trim();
    let hasSubject = newMessage.subject
    if (!hasContent && !hasSubject) {
        if (!confirm('Are you sure you want to send a message without a subject or any text in the message?')) {
            return;
        }
    }

    // TODO: Send the email somewhere
    emit('close');
}


// editor stuff
// https://tiptap.dev/api/
const editor = useEditor({
    content: '',
    autofocus: false,
    extensions: [
        StarterKit.configure({
            heading: {
                levels: [1, 2, 3],
            },
        }),
        // https://github.com/ueberdosis/tiptap/issues/291#issuecomment-867346201
		Paragraph.extend({
			parseHTML() {
				return [{ tag: 'div' }]
			},
			renderHTML({ HTMLAttributes }) {
				return ['div', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0]
			},
		}),
        TextStyle,
        Color,
    ],
    editorProps: {
        attributes: {
            class: 'prose focus:outline-none p-2 h-full',
        }
    },
});
onBeforeUnmount(() => {
    editor.value.destroy();
});


// Colour picker stuff
const elColourPicker = ref<HTMLElement>();
const showColourPicker = ref(false);
function onColourSelected(colour) {
    editor.value.chain().focus().setColor(colour).run();
    showColourPicker.value = false;
}
function onDocClick(event) {
    let el = elColourPicker.value;
    if (showColourPicker.value && el && !el.contains(event.target)) {
        showColourPicker.value = false;
    }
}
document.addEventListener('click', onDocClick);
onBeforeUnmount(() => {
    document.removeEventListener('click', onDocClick);
});

</script>

<template>
  <section class="flex flex-col">
    <header class="flex bg-neutral-700 text-neutral-50 px-2 py-1" v-if="options.showHeader">
        <span class="flex-grow">New Message</span>
        <span class="cursor-pointer" @click="promptClose"><inline-svg src="/svg/delete.svg" class="inline text-xs" /></span>
    </header>

    <div class="meta">
        <div class="flex py-2">
            <label for="compose-to" class="text-sm">To</label>
            <div v-for="(email, emailIdx) in newMessage.to" :key="emailIdx" class="contact-label">
                {{email}} <a @click="removeToEmail(emailIdx)" class="cursor-pointer">
                    <inline-svg src="/svg/delete.svg" class="inline text-xs" />
                </a>
            </div>
            <form @submit.prevent="" class="flex-grow ml-3">
                <contact-select @select="addNewTo($event)" input-id="compose-to" v-focus="options.focus==='to'" />
            </form>
        </div>

        <div class="flex py-2">
            <label for="compose-cc" class="text-sm">Cc</label>
            <div v-for="(email, emailIdx) in newMessage.cc" :key="emailIdx" class="contact-label">
                {{email}} <a @click="removeCcEmail(emailIdx)" class="cursor-pointer">
                    <inline-svg src="/svg/delete.svg" class="inline text-xs" />
                </a>
            </div>
            <form @submit.prevent="" class="flex-grow ml-3">
                <contact-select @select="addNewCc($event)" input-id="compose-cc" v-focus="options.focus==='cc'" />
            </form>
        </div>

        <div class="flex py-2" v-if="options.showTopic">
            <label for="compose-topic" class="text-sm">Topic</label>
            <input id="compose-topic" v-model="newMessage.subject" class="ml-3 flex-grow outline-none" />
        </div>
    </div>

    <div class="flex-grow overflow-auto editor">
        <!-- <div contenteditable class="h-full outline-none"></div> -->
        <editor-content :editor="editor" class="h-full" v-focus="options.focus==='body'" />
    </div>

    <div class="p-2 flex whitespace-nowrap relative tools">
        <div v-if="editor" class="flex flex-grow">
            <bubble-menu
                class="editor-bubble-menu"
                :tippy-options="{ duration: 100 }"
                :editor="editor"
                v-if="editor"
            >
                <button @click="editor.chain().focus().toggleBold().run()" :class="{ 'is-active': editor.isActive('bold') }">
                    Bold
                </button>
                <button @click="editor.chain().focus().toggleItalic().run()" :class="{ 'is-active': editor.isActive('italic') }">
                    Italic
                </button>
                <button @click="editor.chain().focus().toggleStrike().run()" :class="{ 'is-active': editor.isActive('strike') }">
                    Strike
                </button>
            </bubble-menu>


            <div class="border-r border-neutral-200 px-2">
                <button @click="editor.chain().focus().undo().run()">
                    <inline-svg src="/svg/undo.svg" class="inline" />
                </button>
                <button @click="editor.chain().focus().redo().run()">
                    <inline-svg src="/svg/redo.svg" class="inline" />
                </button>
            </div>

            <div class="border-r border-neutral-200 px-2">
                <button @click="editor.chain().focus().toggleHeading({ level: 3 }).run()" :class="{ 'is-active': editor.isActive('heading', { level: 3 }) }">
                    <span class="text-xs">T</span>T
                </button>
                <div class="inline-block">
                    <div v-if="showColourPicker" class="absolute ng-white rounded border border-neutral-300 p-1" style="bottom:100%;" ref="elColourPicker">
                        <colour-picker @selected="onColourSelected($event)" />
                    </div>
                    <button @click.stop="showColourPicker=!showColourPicker">
                        <inline-svg src="/svg/font-color.svg" class="inline" />
                    </button>
                </div>
                <button @click="editor.chain().focus().toggleBulletList().run()" :class="{ 'is-active': editor.isActive('bulletList') }">
                    <inline-svg src="/svg/list-bullet.svg" class="inline" />
                </button>
                <button @click="editor.chain().focus().toggleOrderedList().run()" :class="{ 'is-active': editor.isActive('orderedList') }">
                    <inline-svg src="/svg/list-numbered.svg" class="inline" />
                </button>
            </div>
        </div>

        <button @click="promptClose"><inline-svg src="/svg/trash.svg" class="text-lg mr-2" /></button>
        <button
            class="bg-primary-400 text-primary-100 px-3 py-1 rounded"
            @click="onSendClick"
        >Send</button>
    </div>
  </section>
</template>

<style scoped>

.meta > div {
    border-bottom: 1px solid lightgray;
}

.contact-label {
    @apply ml-3 whitespace-nowrap text-sm border border-neutral-300 rounded px-1 select-none;
}

.tools button {
    @apply mx-2;
}

.editor {
    font-family: Arial, Helvetica, sans-serif;
}
.editor-bubble-menu {
    display: flex;
    background-color: #0D0D0D;
    padding: 0.2rem;
    border-radius: 0.5rem;
}
.editor-bubble-menu button {
    border: none;
    background: none;
    color: #FFF;
    font-size: 0.85rem;
    font-weight: 500;
    padding: 0 0.2rem;
    opacity: 0.6;
}
.editor-bubble-menu button:hover,
.editor-bubble-menu button.is-active {
    opacity: 1;
}
</style>

<style>
.editor .prose h3 {
    margin-top: 0.5em;
    margin-bottom: 0.3em;
}
.editor .prose li {
    margin-top: 0.2em;
    margin-bottom: 0.2em;
}
.editor .prose > ul > li *:last-child,
.editor .prose > ol > li *:last-child {
    margin-bottom: 0;
}
.editor .prose > ul > li *:first-child,
.editor .prose > ol > li *:first-child {
    margin-top: 0;
}
</style>
