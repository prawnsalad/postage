import { createApp } from 'vue';

import directiveFocus from './vueExtras/focus';
import App from './App.vue';

import './global.css'

const app = createApp(App);
app.directive('focus', directiveFocus);

app.mount('#app');
