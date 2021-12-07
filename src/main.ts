import { createApp } from 'vue';
import * as VueRouter from 'vue-router';

import AppInstance from '@/services/AppInstance';
import directiveFocus from '@/vueExtras/focus';
import App from '@/components/App.vue';

import PageSettings from '@/components/pages/settings/Settings.vue';
import PageMessages from '@/components/pages/messages/Messages.vue';

import './global.css'

// Setup + config the app instance
new AppInstance({
    apiUrl: '/api/1/',
});

// Some basic routes throughout the app
const routes = [
    { path: '/', component: PageMessages },
    { path: '/settings', component: PageSettings },
];
const router = VueRouter.createRouter({
    history: VueRouter.createWebHashHistory(),
    routes,
})


const app = createApp(App);
app.use(router);
app.directive('focus', directiveFocus);

app.mount('#app');
