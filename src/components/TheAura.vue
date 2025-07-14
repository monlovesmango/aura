<script setup lang="ts">
import { computed, ref, toRefs, reactive, onMounted } from "vue";

export type Tool = "draw" | "fill" | "rectangle" | "erase";
export type Orientation = "square" | "diamond";
type Picture = {
  orientation: Orientation;
  size: number;
  pixels: string[];
};
type Position = { x: number; y: number };
type Aura = {
  orientation: Orientation;
  pixels: string[];
};

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
const state = reactive<{
  picture: Picture;
  past: Picture[];
  updatedAt: number;
}>({
  picture: Object.assign(
    {},
    {
      size: picture.size,
      orientation: picture.orientation,
      pixels: picture.pixels.slice(),
    },
  ),
  past: [],
  updatedAt: Date.now(),
});

const scale = computed(() =>
  Math.ceil(Math.sqrt(canvasSize.value ** 2 / 2) / picture.size),
);

const auraCanvas = ref<HTMLCanvasElement | null>(null);

function updatePicture() {
  state.past = [Object.assign({}, state.picture), ...state.past];
  state.picture = Object.assign({}, picture);
  state.updatedAt = Date.now();
  drawAura();
}
function undoPicture() {
  if (state.past.length == 0) return;
  const lastPicture = state.past.shift();
  if (!lastPicture) return;
  state.picture = lastPicture;
  state.updatedAt = 0;
  if (lastPicture.size !== picture.size) picture.size = lastPicture.size;
  if (lastPicture.orientation !== picture.orientation)
    picture.orientation = lastPicture.orientation;
  if (lastPicture.pixels !== picture.pixels)
    picture.pixels = lastPicture.pixels;
  drawAura();
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
  if (/^#(?:[0-9a-fA-F]{3}){1,2}$/.test(c) && c !== color.value) {
    color.value = c;
  }
}
function toggleGrid() {
  grid.value = !grid.value;
  drawAura();
}
function setSize(s: number) {
  if (s == picture.size) return;
  picture.size = Math.min(AURA_MAX_SIZE, Math.max(1, s));
  updatePicture();
}
function setOrientation(orientation: Orientation) {
  if (orientation === picture.orientation) return;
  picture.orientation = orientation;
  updatePicture();
}
function undo() {
  undoPicture();
}
function reset() {
  resetPicture();
}
function elt(
  type: string,
  attrs: Record<string, string | number> | null,
  props?: Record<string, any>,
) {
  let dom = document.createElement(type);
  if (attrs) {
    for (let attr of Object.keys(attrs)) {
      let attrValue =
        typeof attrs[attr] != "string" ? attrs[attr].toString() : attrs[attr];
      dom.setAttribute(attr, attrValue);
    }
  }
  if (props) Object.assign(dom, props);
  return dom;
}
function save() {
  let svg = elt("svg", {
    xmlns: "http://www.w3.org/2000/svg",
  });
  drawAuraSVG(picture, svg);
  let link = elt("a", null, {
    href: "data:text/plain;charset=utf-8," + encodeURIComponent(svg.outerHTML),
    download: "aura.svg",
  });
  document.body.appendChild(link);
  link.click();
  link.remove();
}
function drawAuraSVG(picture: Picture, svg: HTMLElement, scale = 100) {
  let auraDiameter = Math.sqrt((picture.size * scale) ** 2 * 2);
  let offset = (auraDiameter - picture.size * scale) / 2;
  svg.setAttribute("width", auraDiameter.toString());
  svg.setAttribute("height", auraDiameter.toString());
  if (picture.orientation === "diamond") {
    svg.style.transform = `rotate(45deg)`;
  }

  for (let y = 0; y < picture.size; y++) {
    for (let x = 0; x < picture.size; x++) {
      if (!getDrawnPixel({ x, y })) continue;
      let pixelRect = elt("rect", {
        x: x * scale + offset,
        y: y * scale + offset,
        width: scale + 1,
        height: scale + 1,
        fill: getDrawnPixel({ x, y }),
      });
      svg.appendChild(pixelRect);
    }
  }
}
const sizeValue = computed(() => picture.size);
const orientationValue = computed(() => picture.orientation);
const colorValue = computed(() => color.value);
const gridValue = computed(() => grid.value);
const toolValue = computed(() => tool.value);
function getAura() {
  let aura: Aura = {
    orientation: picture.orientation,
    pixels: picture.pixels.filter((_color, index) => {
      let row = Math.floor(index / AURA_MAX_SIZE);
      let column = index % AURA_MAX_SIZE;
      return row < picture.size && column < picture.size;
    }),
  };
  return aura;
}
function getTools() {
  return Object.keys(tools) as Tool[];
}
const canUndo = computed(() => state.past.length > 0);
defineExpose({
  pickTool,
  pickColor,
  toggleGrid,
  setSize,
  setOrientation,
  undo,
  reset,
  save,
  sizeValue,
  orientationValue,
  colorValue,
  gridValue,
  toolValue,
  getAura,
  getTools,
  canUndo,
});

function mouseDown(downEvent: MouseEvent) {
  if (!auraCanvas.value) return;
  if (downEvent.button != 0) return;
  let pos = pointerPosition(downEvent);
  let onMove = tools[tool.value](pos);
  if (!onMove) {
    updatePicture();
    return;
  }
  let move = (moveEvent: MouseEvent) => {
    if (moveEvent.buttons == 0) {
      document.removeEventListener("mousemove", move);
      updatePicture();
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
  if (!onMove) {
    updatePicture();
    return;
  }
  let move = (moveEvent: TouchEvent) => {
    let newPos = pointerPosition(moveEvent.touches[0]);
    if (newPos.x == pos.x && newPos.y == pos.y) return;
    pos = newPos;
    onMove(newPos);
  };
  let end = () => {
    document.removeEventListener("touchmove", move);
    document.removeEventListener("touchend", end);
    updatePicture();
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
  picture.pixels = state.picture.pixels.slice();
  for (let { x, y } of pixels) {
    if (x > sizeValue.value || y > sizeValue.value) continue;
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
  let initColor = getDrawnPixel(pos);
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
        getDrawnPixel({ x, y }) == initColor &&
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

  if (grid.value) {
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
  <canvas
    ref="auraCanvas"
    id="aura__canvas"
    @mousedown="mouseDown"
    @touchstart="touchStart"
  >
  </canvas>
</template>
<style lang="css" scoped>
#aura__canvas {
  /* display: block; */
  object-fit: cover;
  /* width: 500px;
  max-width: 95vw; */
  overflow: hidden;
  /* flex-grow: 1; */
  background-color: lightgrey;
  background-image:
    linear-gradient(
      45deg,
      darkgrey 25%,
      transparent 25%,
      transparent 75%,
      darkgrey 75%,
      darkgrey
    ),
    linear-gradient(
      45deg,
      darkgrey 25%,
      transparent 25%,
      transparent 75%,
      darkgrey 75%,
      darkgrey
    );
  background-size: 20px 20px;
  background-position:
    0px 0px,
    30px 30px;
  transition: all 0.5s ease-out;
}
</style>
