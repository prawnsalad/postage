import { createApp } from 'vue';
import * as VueRouter from 'vue-router';

import AppInstance from '@/services/AppInstance';
import directiveFocus from '@/vueExtras/focus';
import App from '@/components/App.vue';

import PageSettings from '@/components/pages/settings/Settings.vue';
import PageMessages from '@/components/pages/messages/Messages.vue';

import './global.css'

// Some app specific config that can be overridden at runtime
const appConfig = Object.assign({
    base: '/',
    apiurl: '/api/1/',
}, (window as any).appconfig || {});

// Setup + config the app instance
new AppInstance({
    apiUrl: appConfig.apiurl,
});

// Some basic routes throughout the app
const routes = [
    { path: '/', redirect: { name: 'messages' } },
    { path: '/messages/:labels?/:threadid?', component: PageMessages, name: 'messages' },
    { path: '/settings', component: PageSettings, name: 'settings' },
];
const router = VueRouter.createRouter({
    history: VueRouter.createWebHistory(appConfig.base),
    routes,
})


const app = createApp(App);
app.use(router);
app.directive('focus', directiveFocus);

app.mount('#app');
