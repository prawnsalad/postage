import { createApp } from 'vue';
import * as VueRouter from 'vue-router';

import AppInstance from '@/services/AppInstance';
import directiveFocus from '@/vueExtras/focus';

import App from '@/components/App.vue';
import AppLogin from '@/components/AppLogin.vue';
import AppLogout from '@/components/AppLogout.vue';
import AppMail from '@/components/AppMail.vue';

import PageSettings from '@/components/pages/settings/Settings.vue';
import PageMessages from '@/components/pages/messages/Messages.vue';

import './global.css'

// Some app specific config that can be overridden at runtime
const appConfig = Object.assign({
    base: '/',
    apiurl: '/api/1/',
}, (window as any).appconfig || {});

// Setup + config the app instance
const appInstance = new AppInstance({
    apiUrl: appConfig.apiurl,
});

// Some basic routes throughout the app
const routes = [
    {
        path: '/',
        component: AppLogin,
        meta: { requiresAuth: false },
        name: 'login'
    },
    {
        path: '/logout',
        component: AppLogout,
        meta: { requiresAuth: false },
        name: 'logout'
    },
    {
        path: '/messages',
        component: AppMail,
        meta: { requiresAuth: true },
        children: [
            { path: ':labels?/:threadid?', name: 'messages', component: PageMessages },
        ]
    },
    {
        path: '/settings',
        component: AppMail,
        meta: { requiresAuth: true },
        children: [
            { path: '', name: 'settings', component: PageSettings },
        ]
    },
];
const router = VueRouter.createRouter({
    history: VueRouter.createWebHistory(appConfig.base),
    routes,
})

router.beforeEach((to, from) => {
    if (to.meta?.requiresAuth && !appInstance.account.isLoggedIn()) {
        return {name: 'login'};
    }

    if (to.name === 'login' && appInstance.account.isLoggedIn()) {
        return {name: 'messages'};
    }
});

appInstance.checkStatus().then(() => {
    const app = createApp(App);
    app.use(router);
    app.directive('focus', directiveFocus);

    app.mount('#app');
});
