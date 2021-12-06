import { createApp } from 'vue';

import AppInstance from '@/services/AppInstance';
import directiveFocus from '@/vueExtras/focus';
import App from '@/components/App.vue';

import './global.css'

// Setup + config the app instance
new AppInstance({
    apiUrl: '/api/1/',
});

const app = createApp(App);
app.directive('focus', directiveFocus);

app.mount('#app');
