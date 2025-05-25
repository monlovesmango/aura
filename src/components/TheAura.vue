<script setup lang="ts">
import { computed, ref, toRefs } from "vue";

type Tool = "draw" | "fill" | "rectangle" | "erase";
type Orientation = "square" | "diamond";
interface Props {
  canvasSize: number;
}

const props = defineProps<Props>();
const { canvasSize } = toRefs(props);

const tool = ref<Tool>("draw");
const size = ref(10);
const color = ref("#000000");
const orientation = ref<Orientation>("square");
const scale = computed(() =>
  Math.ceil(Math.sqrt(canvasSize.value ** 2 / 2) / size.value),
);

const auraCanvas = ref<HTMLCanvasElement | null>(null);

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
function toggleOrientation() {
  if (orientation.value == "square") orientation.value = "diamond";
  else orientation.value = "square";
}
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

function mouse(downEvent: MouseEvent, onDown: Function) {
  if (!auraCanvas.value) return;
  if (downEvent.button != 0) return;
  let pos = pointerPosition(downEvent);
  let onMove = onDown(pos);
  if (!onMove) return;
  let move = (moveEvent: MouseEvent) => {
    if (moveEvent.buttons == 0) {
      document.removeEventListener("mousemove", move);
    } else {
      let newPos = pointerPosition(moveEvent);
      if (newPos.x == pos.x && newPos.y == pos.y) return;
      pos = newPos;
      onMove(newPos);
    }
  };
  document.addEventListener("mousemove", move);
}

function touch(startEvent: TouchEvent, onDown: Function) {
  let pos = pointerPosition(startEvent.touches[0]);
  let onMove = onDown(pos);
  startEvent.preventDefault();
  if (!onMove) return;
  let move = (moveEvent: TouchEvent) => {
    let newPos = pointerPosition(moveEvent.touches[0]);
    if (newPos.x == pos.x && newPos.y == pos.y) return;
    pos = newPos;
    onMove(newPos);
  };
  let end = () => {
    document.removeEventListener("touchmove", move);
    document.removeEventListener("touchend", end);
  };
  document.addEventListener("touchmove", move);
  document.addEventListener("touchend", end);
}

function pointerPosition(pos: { clientX: number; clientY: number }) {
  if (!auraCanvas.value || !auraCanvas.value.getBoundingClientRect)
    return { x: 0, y: 0 };
  let rect = auraCanvas.value.getBoundingClientRect();
  let auraCanvasPos = {
    x: pos.clientX - rect.left,
    y: pos.clientY - rect.top,
  };
  let center = {
    x: rect.width / 2,
    y: rect.height / 2,
  };
  let centerDelta = {
    x: auraCanvasPos.x - center.x,
    y: auraCanvasPos.y - center.y,
  };
  if (orientation.value === "diamond") {
    let radius = Math.sqrt(centerDelta.x ** 2 + centerDelta.y ** 2);
    let angle = Math.atan2(centerDelta.y, centerDelta.x);
    centerDelta.x = radius * Math.cos(angle - Math.PI / 4);
    centerDelta.y = radius * Math.sin(angle - Math.PI / 4);
  }
  return {
    x: Math.floor(centerDelta.x / scale.value + size.value / 2),
    y: Math.floor(centerDelta.y / scale.value + size.value / 2),
  };
}
</script>

<template>
  <canvas
    ref="canavas"
    :onmousedown="mouse"
    :ontouchstart="touch"
    style="width: 600; height: 600"
  >
  </canvas>
</template>
