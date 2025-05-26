<script setup lang="ts">
import { computed, ref, toRefs, reactive } from "vue";

type Tool = "draw" | "fill" | "rectangle" | "erase";
type Orientation = "square" | "diamond";
type Picture = {
  orientation: Orientation;
  size: number;
  pixels: string[];
};

interface Props {
  canvasSize: number;
}

const AURA_MAX_SIZE = 11;

const props = defineProps<Props>();
const { canvasSize } = toRefs(props);

const tool = ref<Tool>("draw");
const color = ref("#000000");
const picture = reactive<Picture>({
  size: 10,
  orientation: "square",
  pixels: new Array(AURA_MAX_SIZE * AURA_MAX_SIZE).fill(""),
});
const state: {
  picture: Picture;
  past: Picture[];
  updatedAt: number;
} = {
  picture: Object.assign(picture),
  past: [],
  updatedAt: Date.now(),
};

const scale = computed(() =>
  Math.ceil(Math.sqrt(canvasSize.value ** 2 / 2) / picture.size),
);

const auraCanvas = ref<HTMLCanvasElement | null>(null);

function updatePicture() {
  state.picture = Object.assign({}, picture);
  state.past = [Object.assign({}, state.picture), ...state.past];
  state.updatedAt = Date.now();
}
function lastPicture() {
  if (state.past.length == 0) return;
  const lastPicture = state.past[0];
  state.past = state.past.slice(1);
  state.updatedAt = 0;
  if (lastPicture.size !== picture.size) picture.size = lastPicture.size;
  if (lastPicture.orientation !== picture.orientation)
    picture.orientation = lastPicture.orientation;
  if (lastPicture.pixels !== picture.pixels)
    picture.pixels = lastPicture.pixels;
}
function resetPicture() {
  picture.size = 10;
  picture.orientation = "square";
  picture.pixels = new Array(AURA_MAX_SIZE * AURA_MAX_SIZE).fill("");
  updatePicture();
}
function pickTool(t: Tool) {
  if (t !== tool.value) tool.value = t;
}
function pickColor(c: string) {
  if (/^#(?:[0-9a-fA-F]{3}){1,2}$/.test(c)) {
    color.value = c;
  }
}
function toggleGrid() {}
function setSize(s: number) {
  if (s == picture.size) return;
  picture.size = Math.min(AURA_MAX_SIZE, Math.max(1, s));
  updatePicture();
}
function setOrientation() {
  picture.orientation = picture.orientation == "square" ? "diamond" : "square";
  updatePicture();
}
function undo() {
  lastPicture();
}
function reset() {
  resetPicture();
}

defineExpose({
  pickTool,
  pickColor,
  toggleGrid,
  setSize,
  setOrientation,
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

// this.canvas = new AuraCanvas(state, (pos) => {
//   let tool = tools[this.state.tool];
//   let onMove = tool(pos, this.state, dispatch);
//   if (onMove) return (pos) => onMove(pos, this.state);
// });
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
  if (picture.orientation === "diamond") {
    let radius = Math.sqrt(centerDelta.x ** 2 + centerDelta.y ** 2);
    let angle = Math.atan2(centerDelta.y, centerDelta.x);
    centerDelta.x = radius * Math.cos(angle - Math.PI / 4);
    centerDelta.y = radius * Math.sin(angle - Math.PI / 4);
  }
  return {
    x: Math.floor(centerDelta.x / scale.value + picture.size / 2),
    y: Math.floor(centerDelta.y / scale.value + picture.size / 2),
  };
}

function pixel(x: number, y: number) {
  return picture.pixels[x + y * AURA_MAX_SIZE];
}
function drawPixels(pixels: { x: number; y: number }[]) {
  for (let { x, y } of pixels) {
    picture.pixels[x + y * AURA_MAX_SIZE] = color.value;
  }
  return;
}

//   tools
function draw(pos: { x: number; y: number }) {
  drawPixels([pos]);
}
function rectangle(start, state, dispatch) {
  function drawRectangle(pos) {
    let xStart = Math.min(start.x, pos.x);
    let yStart = Math.min(start.y, pos.y);
    let xEnd = Math.max(start.x, pos.x);
    let yEnd = Math.max(start.y, pos.y);
    let drawn = [];
    for (let y = yStart; y <= yEnd; y++) {
      for (let x = xStart; x <= xEnd; x++) {
        drawn.push({ x, y, color: state.color });
      }
    }
    dispatch({ picture: state.picture.draw(drawn) });
  }
  drawRectangle(start);
  return drawRectangle;
}
const around = [
  { dx: -1, dy: 0 },
  { dx: 1, dy: 0 },
  { dx: 0, dy: -1 },
  { dx: 0, dy: 1 },
];

function fill({ x, y }, state, dispatch) {
  let targetColor = state.picture.pixel(x, y);
  let drawn = [{ x, y, color: state.color }];
  for (let done = 0; done < drawn.length; done++) {
    for (let { dx, dy } of around) {
      let x = drawn[done].x + dx,
        y = drawn[done].y + dy;
      if (
        x >= 0 &&
        x < state.picture.size &&
        y >= 0 &&
        y < state.picture.size &&
        state.picture.pixel(x, y) == targetColor &&
        !drawn.some((p) => p.x == x && p.y == y)
      ) {
        drawn.push({ x, y, color: state.color });
      }
    }
  }
  dispatch({ picture: state.picture.draw(drawn) });
}
function erase(pos, state, dispatch) {
  function erasePixel({ x, y }, state) {
    let drawn = { x, y, color: null };
    dispatch({ picture: state.picture.draw([drawn]) });
  }
  erasePixel(pos, state);
  return erasePixel;
}
const tools: Record<Tool, Function> = { draw, fill, rectangle, erase };
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
