import { createApp } from 'vue';

import directiveFocus from './vueExtras/focus';
import App from './App.vue'

import './global.css'

const app = createApp(App);
directiveFocus(app);


app.mount('#app');
