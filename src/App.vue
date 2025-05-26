<script setup lang="ts">
import { ref, type Component } from "vue";
import TheAura from "./components/TheAura.vue";

const aura = ref<typeof TheAura | null>(null);
</script>

<template>
  <div id="aura-app">
    <h1>aura</h1>
    <div id="aura-options">
      <label>aura size:</label>
      <div id="aura-size-buttons">
        <button
          v-for="size of Array.from({ length: 11 }, (_, i) => i + 1)"
          :class="
            size === aura?.getSize()
              ? 'button button-small'
              : 'button button-small button-outline'
          "
        >
          {{ size + " x " + size }}
        </button>
      </div>
      <label>aura orientation:</label>
      <div id="aura-orientation-buttons">
        <button
          v-for="orientation of ['square', 'diamond']"
          :class="
            orientation === aura?.getOrientation()
              ? 'button button-small'
              : 'button button-small button-outline'
          "
        >
          {{ orientation }}
        </button>
      </div>
    </div>
    <TheAura ref="aura" :canvasSize="700" />
    <div id="aura-tools">
      <label>🖌 Tool:</label>
      <div>
        <select id="aura-tool">
          <option v-for="tool of Object.keys(aura?.getTools() || {})">
            {{ tool }}
          </option>
        </select>
      </div>
      <label>🎨 Color:</label>
      <div>
        <input type="color" :value="aura?.getColor() || '#000000'" />
      </div>
      <button class="button button-outline">
        {{ aura?.getGrid() ? "hide grid" : "show grid" }}
      </button>
    </div>
    <div id="aura-actions">
      <button
        class="button button-outline"
        :disabled="aura?.canUndo() ? false : true"
      >
        undo
      </button>
      <button
        class="button button-outline"
        :disabled="aura?.canUndo() ? false : true"
      >
        reset
      </button>
      <button
        class="button button-outline"
        :disabled="aura?.canUndo() ? false : true"
      >
        💾 save
      </button>
    </div>
  </div>
</template>
