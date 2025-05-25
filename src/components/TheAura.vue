<script setup lang="ts">
import { ref } from "vue";

type Tool = "draw" | "fill" | "rectangle" | "erase";

const tool = ref<Tool>("draw");
const size = ref(10);
const color = ref("#000000");

const canvas = ref(null);

function pickTool(t: Tool) {
  tool.value = t;
}
function pickSize(s: number) {
  size.value = Math.min(11, Math.max(1, s));
}
function pickColor(c: string) {
  if (/^#(?:[0-9a-fA-F]{3}){1,2}$/.test(c)) {
    color.value = c;
  }
}
function toggleOrientation() {}
function toggleGrid() {}
function undo() {}
function reset() {}

defineExpose({
  pickTool,
  pickSize,
  pickColor,
  toggleOrientation,
  toggleGrid,
  undo,
  reset,
});
</script>

<template>
  <canvas ref="canavas"> </canvas>
</template>
