<script setup lang="ts">
import { computed, ref, toRefs, reactive, onMounted } from "vue";

type Tool = "draw" | "fill" | "rectangle" | "erase";
type Orientation = "square" | "diamond";
type Picture = {
  orientation: Orientation;
  size: number;
  pixels: string[];
};
type Position = { x: number; y: number };

interface Props {
  canvasSize: number;
}

const AURA_MAX_SIZE = 11;

const props = defineProps<Props>();
const { canvasSize } = toRefs(props);

const grid = ref<boolean>(true);
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

function mouseDown(downEvent: MouseEvent) {
  if (!auraCanvas.value) return;
  if (downEvent.button != 0) return;
  let pos = pointerPosition(downEvent);
  let onMove = tools[tool.value](pos);
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

function touchStart(startEvent: TouchEvent) {
  let pos = pointerPosition(startEvent.touches[0]);
  let onMove = tools[tool.value](pos);
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
  let pixelPos = {
    x: Math.floor(centerDelta.x / scale.value + picture.size / 2),
    y: Math.floor(centerDelta.y / scale.value + picture.size / 2),
  };
  return pixelPos;
}

function getDrawnPixel(pos: Position) {
  return picture.pixels[pos.x + pos.y * AURA_MAX_SIZE];
}
function drawPixels(pixels: { x: number; y: number }[], erase = false) {
  picture.pixels = state.picture.pixels;
  for (let { x, y } of pixels) {
    picture.pixels[x + y * AURA_MAX_SIZE] = erase ? "" : color.value;
  }
  drawAura();
  return;
}

//   tools
function draw(pos: Position) {
  let drawn: Position[] = [];
  function drawPixel(pos: Position) {
    drawn.push(pos);
    drawPixels(drawn);
  }
  drawPixel(pos);
  return drawPixel;
}
function rectangle(start: Position) {
  function drawRectangle(pos: Position) {
    let xStart = Math.min(start.x, pos.x);
    let yStart = Math.min(start.y, pos.y);
    let xEnd = Math.max(start.x, pos.x);
    let yEnd = Math.max(start.y, pos.y);
    let drawn = [];
    for (let y = yStart; y <= yEnd; y++) {
      for (let x = xStart; x <= xEnd; x++) {
        drawn.push({ x, y });
      }
    }
    drawPixels(drawn);
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

function fill(pos: Position) {
  let drawn = [pos];
  for (let done = 0; done < drawn.length; done++) {
    for (let { dx, dy } of around) {
      let x = drawn[done].x + dx,
        y = drawn[done].y + dy;
      if (
        x >= 0 &&
        x < state.picture.size &&
        y >= 0 &&
        y < state.picture.size &&
        getDrawnPixel({ x, y }) == color.value &&
        !drawn.some((p) => p.x == x && p.y == y)
      ) {
        drawn.push({ x, y });
      }
    }
  }
  drawPixels(drawn);
}
function erase(pos: Position) {
  let drawn: Position[] = [];
  function erasePixel(pos: Position) {
    drawn.push(pos);
    drawPixels(drawn, true);
  }
  erasePixel(pos);
  return erasePixel;
}
const tools: Record<Tool, Function> = { draw, fill, rectangle, erase };
function drawAura() {
  if (!auraCanvas.value) return;
  let canvas = auraCanvas.value;
  if (!canvas) return;
  let cx = canvas.getContext("2d");
  if (!cx) return;
  canvas.width = picture.size * scale.value;
  canvas.height = picture.size * scale.value;
  if (picture.orientation === "square") {
    canvas.style.transform = "";
    canvas.style.marginTop = `0`;
    canvas.style.marginBottom = `0`;
  } else if (picture.orientation === "diamond") {
    canvas.style.transform = `rotate(45deg)`;
    canvas.style.marginTop = `${(picture.size * scale.value) / 5}px`;
    canvas.style.marginBottom = `${(picture.size * scale.value) / 5}px`;
  }

  for (let y = 0; y < picture.size; y++) {
    for (let x = 0; x < picture.size; x++) {
      if (!getDrawnPixel({ x, y })) continue;
      cx.fillStyle = getDrawnPixel({ x, y });
      cx.fillRect(x * scale.value, y * scale.value, scale.value, scale.value);
    }
  }

  if (grid) {
    for (let y = 0; y < picture.size; y++) {
      cx.strokeStyle = "#181a1b";
      cx.beginPath();
      cx.moveTo(y * scale.value, 0);
      cx.lineTo(y * scale.value, picture.size * scale.value);
      cx.stroke();
      cx.beginPath();
      cx.moveTo(0, y * scale.value);
      cx.lineTo(picture.size * scale.value, y * scale.value);
      cx.stroke();
    }
  }
}
onMounted(() => {
  drawAura();
});
</script>

<template>
  <canvas ref="auraCanvas" @mousedown="mouseDown" @touchstart="touchStart">
  </canvas>
</template>
