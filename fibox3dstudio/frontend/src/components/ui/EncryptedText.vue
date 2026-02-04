<script setup>
import { ref, onMounted, computed } from 'vue'

const props = defineProps({
  text: { type: String, required: true },
  encryptedClassName: { type: String, default: 'text-neutral-500' },
  revealedClassName: { type: String, default: 'text-white' },
  revealDelayMs: { type: Number, default: 50 },
  autoStart: { type: Boolean, default: true }
})

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?'
const displayText = ref('')
const revealedIndices = ref(new Set())

const getRandomChar = () => CHARS[Math.floor(Math.random() * CHARS.length)]

const animate = () => {
  const textLength = props.text.length
  let currentIndex = 0
  
  // Initial encrypted state
  displayText.value = props.text.split('').map(() => getRandomChar()).join('')
  
  const revealInterval = setInterval(() => {
    if (currentIndex >= textLength) {
      clearInterval(revealInterval)
      return
    }
    
    revealedIndices.value.add(currentIndex)
    
    // Update display with revealed characters
    displayText.value = props.text.split('').map((char, i) => {
      if (revealedIndices.value.has(i)) {
        return char
      }
      return getRandomChar()
    }).join('')
    
    currentIndex++
  }, props.revealDelayMs)
  
  // Keep scrambling unrevealed characters
  const scrambleInterval = setInterval(() => {
    if (revealedIndices.value.size >= textLength) {
      clearInterval(scrambleInterval)
      return
    }
    
    displayText.value = props.text.split('').map((char, i) => {
      if (revealedIndices.value.has(i)) {
        return char
      }
      return getRandomChar()
    }).join('')
  }, 50)
}

const getCharClass = (index) => {
  return revealedIndices.value.has(index) ? props.revealedClassName : props.encryptedClassName
}

onMounted(() => {
  if (props.autoStart) {
    setTimeout(animate, 100)
  }
})

defineExpose({ animate })
</script>

<template>
  <span class="font-mono">
    <span
      v-for="(char, index) in displayText"
      :key="index"
      :class="getCharClass(index)"
      class="transition-colors duration-300"
    >{{ char }}</span>
  </span>
</template>
