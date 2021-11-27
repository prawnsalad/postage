import { Directive, nextTick } from 'vue';

const directive: Directive = {
    mounted(el: HTMLElement, binding: any, vnode: any) {
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
};

export default directive;

function findAndFocus(el: HTMLElement) {
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

    let editable = el.querySelector<HTMLElement>('div[contenteditable="true"]');
    if (editable) {
        editable.focus();
        return true;
    }

    return false;
}
