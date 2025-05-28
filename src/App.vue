<script setup lang="ts">
import { useTemplateRef, onMounted, computed } from "vue";
import TheAura from "./components/TheAura.vue";
import type { Orientation, Tool } from "./components/TheAura.vue";

// const aura = toRefs<Record<keyof TheAura, any> | null>(null);
const aura = useTemplateRef("aura");

const grid = computed(() => aura.value?.gridValue);
const size = computed(() => aura.value?.sizeValue);
const orientation = computed(() => aura.value?.orientationValue);
const tool = computed(() => aura.value?.toolValue);
const canUndo = computed(() => aura.value?.canUndo);
onMounted(() => {
  if (!aura.value) return;
  aura?.value.colorValue;
  return aura;
});
</script>

<template>
  <div id="aura-app">
    <h1>aura</h1>
    <div id="aura-options">
      <label>aura size:</label>
      <div id="aura-size-buttons">
        <button
          v-for="s of Array.from({ length: 11 }, (_, i) => i + 1)"
          :class="
            s === size
              ? 'button button-small'
              : 'button button-small button-outline'
          "
          @click="aura?.setSize(s)"
        >
          {{ s + " x " + s }}
        </button>
      </div>
      <label>aura orientation:</label>
      <div id="aura-orientation-buttons">
        <button
          v-for="o of ['square', 'diamond'] as Orientation[]"
          :class="
            o === orientation
              ? 'button button-small'
              : 'button button-small button-outline'
          "
          @click="aura?.setOrientation(o)"
        >
          {{ o }}
        </button>
      </div>
    </div>
    <TheAura ref="aura" :canvasSize="700" />
    <div>{{ canUndo }}</div>
    <div id="aura-tools">
      <label>🖌 Tool:</label>
      <div>
        <select
          id="aura-tool"
          :value="tool"
          @change="
            (event: Event) => {
              const target = event.target as HTMLInputElement;
              if (!target.value) return;
              aura?.pickTool(target.value as Tool);
            }
          "
        >
          <option v-for="tool of aura?.getTools() as Tool[]">
            {{ tool }}
          </option>
        </select>
      </div>
      <label>🎨 Color:</label>
      <div>
        <input
          type="color"
          :value="aura?.colorValue"
          @change="
            (event: Event) => {
              const target = event.target as HTMLInputElement;
              if (!target.value) return;
              aura?.pickColor(target.value);
            }
          "
        />
      </div>
      <button class="button button-outline" @click="aura?.toggleGrid()">
        {{ grid ? "hide grid" : "show grid" }}
      </button>
    </div>
    <div id="aura-actions">
      <button
        class="button button-outline"
        :disabled="canUndo ? false : true"
        @click="aura?.undo()"
      >
        undo
      </button>
      <button
        class="button button-outline"
        :disabled="canUndo ? false : true"
        @click="aura?.reset()"
      >
        reset
      </button>
      <button class="button button-outline" :disabled="canUndo ? false : true">
        💾 save
      </button>
    </div>
  </div>
</template>
