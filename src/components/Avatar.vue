<script setup lang="ts">
import { ref, computed } from 'vue';

const props = defineProps({
  name: String,
});

const initials = computed(() => {
    let initial = '';
    let name = props.name || '';

    let parts = name.split(' ');
    if (parts.length === 1) {
        initial = parts[0][0];
    } else if (parts.length > 1) {
        // First letter of the first + last name
        initial = parts[0][0] + parts[parts.length - 1][0];
    }

    return (initial || '').toUpperCase();
});

const initialColour = computed(() => {
    let sumAsciiVal = initials.value
        .split('')
        .map(letter => letter.charCodeAt(0))
        .reduce((previous, current) => previous + current, 0);
    let col = colours[sumAsciiVal % colours.length];
    return col;

});



const colours: Array<string> = [];
generateColours();
function generateColours() {
    let sat = 70;
    let lum = 50;

    let numColours = 10;
    let maxHue = 325; // 0-325 = usable colour hue range. 325+ is just more reds that 0+ starts with
    let stepSize = Math.floor(maxHue / numColours); 
    for(let hue=0; hue < maxHue; hue=hue+stepSize) {
        colours.push(`hsl(${hue}, ${sat}%, ${lum}%)`);
    }
}
</script>

<template>
  <div class="avatar flex items-center justify-center" :style="{backgroundColor: initialColour}">
      <div class="avatar-content text-white">{{initials}}</div>
  </div>
</template>

<style scoped>

.avatar {
    border-radius: 30%;
    width: 45px;
    height: 45px;
    background: red;
}
</style>
