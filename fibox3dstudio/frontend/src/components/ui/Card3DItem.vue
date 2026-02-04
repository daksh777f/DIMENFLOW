<script setup>
import { ref } from 'vue'

defineProps({
  translateZ: { type: [Number, String], default: 0 },
  as: { type: String, default: 'div' }
})

const rotateX = ref(0)
const rotateY = ref(0)

const handleMouseMove = (e) => {
  const card = e.currentTarget
  const rect = card.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  const centerX = rect.width / 2
  const centerY = rect.height / 2
  
  rotateY.value = ((x - centerX) / centerX) * 10
  rotateX.value = ((centerY - y) / centerY) * 10
}

const handleMouseLeave = () => {
  rotateX.value = 0
  rotateY.value = 0
}
</script>

<template>
  <div
    class="card-3d-item"
    :style="{
      transform: `translateZ(${translateZ}px)`,
      transition: 'transform 0.3s ease-out'
    }"
  >
    <component :is="as">
      <slot />
    </component>
  </div>
</template>

<style scoped>
.card-3d-item {
  transform-style: preserve-3d;
}
</style>
