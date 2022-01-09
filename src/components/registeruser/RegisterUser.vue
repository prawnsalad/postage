<script setup lang="ts">

import { ref, reactive, watchEffect, markRaw } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import AppInstance from '@/services/AppInstance';
import Logo from '@/components/Logo.vue';

const emit = defineEmits<{
    (event: 'close'): void,
    (event: 'registered', credentials: object): void,
}>();

const router = useRouter();
const route = useRoute();

const appInstance = AppInstance.instance();

const registerForm = reactive({
  errorMessage: '',
  loading: 0,
  username: '',
  password: '',
  completed: false,
});

function sleep(l) {
  return new Promise(r => setTimeout(r, l));
}

async function onRegisterSubmit() {
  try {
    registerForm.loading = Date.now();
    registerForm.errorMessage = '';

    let [err, ret] = await appInstance.api.call('app.register', {
        name: registerForm.username,
        password: registerForm.password,
    });

    // Make sure at least some time has passed to make it obvious we did something
    await sleep(300 - (Date.now() - registerForm.loading));

    if (err) {
        let errMap = {
            not_implemented: 'User registration has not been implemented yet',
            username_unavailable: 'That username is unavailable',
        };
        registerForm.errorMessage = errMap[err.code] || 'An error occured while trying to register';
        return;
    }

    if (ret?.name) {
      registerForm.completed = true;
      emit('registered', {
        name: registerForm.username,
        password: registerForm.password,
      });
    }

  } catch(err) {
    console.error(err);
    registerForm.errorMessage = 'An error occured while trying to register';
  } finally {
    registerForm.loading = 0;
  }
}

</script>

<template>
    <h2 class="text-xl font-bold mb-4">Create an account</h2>
    <form @submit.prevent="onRegisterSubmit">
        <div class="overflow-hidden">
            <div v-if="registerForm.errorMessage" class="text-danger-800">
                {{registerForm.errorMessage}}
            </div>

            <label class="block mb-4">
                <span class="block">Username</span>
                <input v-model="registerForm.username" v-focus />
            </label>

            <label class="block mb-4">
                <span class="block">Password</span>
                <input type="password" v-model="registerForm.password" />
            </label>
        </div>

        <button type="submit" :disabled="registerForm.loading!==0 || !registerForm.username || !registerForm.password">
            {{registerForm.loading || registerForm.completed ? 'Creating account..' : 'Create account'}}
        </button>

        <div class="mt-16 text-base">
            <a @click="emit('close')">Already have an account?</a>
        </div>
    </form>
</template>

<style scoped>

</style>
