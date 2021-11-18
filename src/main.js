import { createApp } from 'vue'
import App from './App.vue'

import './global.css'

const app = createApp(App);

app.directive('focus', {
    mounted(el, binding, vnode) {
        if (['INPUT', 'SELECT', 'TEXTAREA'].includes(el.nodeName)) {
            el.focus();
        } else if(el.querySelector) {
            let firstInput = el.querySelector('input');
            if (firstInput) {
                firstInput.focus();
            }
        }
    }
});

app.mount('#app');
