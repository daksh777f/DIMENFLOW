<script setup>
import { ref } from 'vue'

const rotateX = ref(0)
const rotateY = ref(0)

const handleMouseMove = (e) => {
  const card = e.currentTarget
  const rect = card.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  const centerX = rect.width / 2
  const centerY = rect.height / 2
  
  rotateY.value = ((x - centerX) / centerX) * 8
  rotateX.value = ((centerY - y) / centerY) * 8
}

const handleMouseLeave = () => {
  rotateX.value = 0
  rotateY.value = 0
}
</script>

<template>
  <div 
    class="card-3d-container perspective-1000"
    @mousemove="handleMouseMove"
    @mouseleave="handleMouseLeave"
  >
    <div
      class="card-3d-content"
      :style="{
        transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
        transition: 'transform 0.3s ease-out'
      }"
    >
      <slot />
    </div>
  </div>
</template>

<style scoped>
.perspective-1000 {
  perspective: 1000px;
}

.card-3d-container {
  display: inline-block;
}

.card-3d-content {
  transform-style: preserve-3d;
  will-change: transform;
}
</style>
