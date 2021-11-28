<script setup lang="ts">

defineProps({
  colour: Object,
});

const emit = defineEmits([
    'selected',
]);

const hues = [
    // shades light -> dark
    ['#EA9999', '#EA9999', '#E06666', '#CC0000', '#990000', '#660000'],
    ['#fce5cd', '#f9cb9c', '#f6b26b', '#e69138', '#b45f06', '#783f04'],
    ['#FFF2CC', '#FFE599', '#FFD966', '#F1C232', '#BF9000', '#7F6000'],
    ['#D9EAD3', '#B6D7A8', '#93C47D', '#6AA84F', '#38761D', '#274E13'],
    ['#D0E0E3', '#A2C4C9', '#76A5AF', '#45818E', '#134F5C', '#0C343D'],
    ['#CFE2F3', '#9FC5E8', '#6FA8DC', '#3D85C6', '#0B5394', '#073763'],
    ['#D9D2E9', '#B4A7D6', '#8E7CC3', '#674EA7', '#351C75', '#20124D'],

    ['#EAD1DC', '#D5A6BD', '#C27BA0', '#A64D79', '#741B47', '#4C1130'],
];




</script>


<template>
    <div>
        <span class="text-sm">Text colour</span>
        <div class="grid grid-cols-8">
            <template v-for="(_, shadeIdx) in hues[0]">
                <div
                    v-for="(_, hueIdx) in hues"
                    :key="`${shadeIdx}-${hueIdx}`"
                    :style="{background:hues[hueIdx][shadeIdx]}"
                    class="border border-white hover:border-black cursor-pointer"
                    style="width:20px;height:20px;"
                    @click="$emit('selected', hues[hueIdx][shadeIdx])"
                ></div>
            </template>
        </div>
    </div>
</template>

<style scoped>

</style>
