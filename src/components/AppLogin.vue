<script setup lang="ts">

import { ref, reactive, watchEffect, markRaw } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import AppInstance from '@/services/AppInstance';
import Logo from '@/components/Logo.vue';
import RegisterUserVue from './registeruser/RegisterUser.vue';
import RegisterUser from './registeruser/RegisterUser.vue';

const router = useRouter();
const route = useRoute();

const loginForm = reactive({
  errorMessage: '',
  loading: 0,
  username: '',
  password: '',
  completed: false,
});

const showRegisterUser = ref(false);

function sleep(l) {
  return new Promise(r => setTimeout(r, l));
}

async function onLoginSubmit() {
  try {
    loginForm.loading = Date.now();
    loginForm.errorMessage = '';

    let goodAuth = await AppInstance.instance().account.login(loginForm.username, loginForm.password);

    // Make sure at least some time has passed to make it obvious we did something
    await sleep(300 - (Date.now() - loginForm.loading));

    if (goodAuth) {
      loginForm.completed = true;
      await sleep(400);
      router.push({name: 'messages'});
    } else {
      loginForm.errorMessage = 'That username and password could not be found';
    }

  } catch(err) {
    console.error(err);
    loginForm.errorMessage = 'There was an error logging in';
  } finally {
    loginForm.loading = 0;
  }
}

function onRegisteredComplete(event) {
  loginForm.username = event.name;
  loginForm.password = event.password;
  showRegisterUser.value = false;
}

const appInstance = AppInstance.instance();
if (appInstance.account.isLoggedIn()) {
  router.push({name: 'messages'});
}

</script>

<template>
  <div class="h-full flex">
    <div class="bg-primary-200 border-r-4 border-primary-900 flex-grow"></div>
    <div class="p-28 text-lg">
      <logo class="mb-12" />

      <form
        v-if="!showRegisterUser"
        @submit.prevent="onLoginSubmit"
        :class="{completed: loginForm.completed}"
      >
        <div class="slideaway overflow-hidden">
          <div v-if="loginForm.errorMessage" class="text-danger-800">
            {{loginForm.errorMessage}}
          </div>

          <label class="block mb-4">
            <span class="block">Username</span>
            <input v-model="loginForm.username" v-focus />
          </label>

          <label class="block mb-4">
            <span class="block">Password</span>
            <input type="password" v-model="loginForm.password" />
          </label>
        </div>

        <button type="submit" :disabled="loginForm.loading!==0 || !loginForm.username || !loginForm.password">
          {{loginForm.loading || loginForm.completed ? 'Signing in..' : 'Sign in'}}
        </button>

        <div v-if="appInstance.policy('registration.enabled', true)" class="mt-16 text-base">
          <a @click="showRegisterUser=true">Create an account</a>
        </div>
      </form>
      <register-user
        v-else
        @close="showRegisterUser=false"
        @registered="onRegisteredComplete"
      ></register-user>
    </div>
  </div>
</template>

<style scoped>
form .slideaway {
  max-height: 50rem;
  transition: max-height 0.3s ease-out, opacity 0.3s;
}
form.completed .slideaway {
  max-height: 0;
  opacity: 0;
}
</style>
