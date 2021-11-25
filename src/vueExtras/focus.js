import { nextTick } from 'vue'

export default function(app) {
    app.directive('focus', {
        mounted(el, binding, vnode) {
            if (binding.value === false) {
                return;
            }

            // If we didn't find anything to focus, try in the nextTick just in case the
            // component needs time to setup
            if (!findAndFocus(el)) {
                nextTick(() => {
                    findAndFocus(el);
                });
            }
        }
    });
}

function findAndFocus(el) {
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(el.nodeName)) {
        el.focus();
        return true;
    }

    if(!el.querySelector) {
        return false;
    }

    let firstInput = el.querySelector('input');
    if (firstInput) {
        firstInput.focus();
        return true;
    }

    let editable = el.querySelector('[contenteditable="true"]');
    if (editable) {
        editable.focus();
        return true;
    }

    return false;
}
