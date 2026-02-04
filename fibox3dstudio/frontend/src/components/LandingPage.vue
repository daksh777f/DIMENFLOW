<script setup>
import { ref } from 'vue'
import FaultyTerminal from './FaultyTerminal.vue'
import EncryptedText from './ui/EncryptedText.vue'
import Card3D from './ui/Card3D.vue'
import Card3DItem from './ui/Card3DItem.vue'

const emit = defineEmits(['get-started', 'skip-to-app'])

const showContent = ref(false)

// Show content after welcome animation
setTimeout(() => {
  showContent.value = true
}, 2500)

const features = [
  {
    icon: '🎨',
    title: 'Ideation Studio',
    description: 'Transform your ideas into stunning 3D scenes with AI-powered text and image generation.',
    gradient: 'from-purple-600 to-pink-600'
  },
  {
    icon: '🔍',
    title: 'Smart Detection',
    description: 'Advanced AI object recognition with bounding boxes and intelligent scene analysis.',
    gradient: 'from-blue-600 to-cyan-600'
  },
  {
    icon: '🏗️',
    title: '3D Conversion',
    description: 'Instant conversion from 2D renders to fully interactive 3D models using TripoSR.',
    gradient: 'from-emerald-600 to-teal-600'
  },
  {
    icon: '📐',
    title: 'Floor Plans',
    description: 'Automatic floor plan generation with precise spatial understanding and layout.',
    gradient: 'from-orange-600 to-red-600'
  }
]
</script>

<template>
  <div class="fixed inset-0 bg-black overflow-hidden">
    <!-- FaultyTerminal Background -->
    <div class="absolute inset-0 z-0">
      <FaultyTerminal
        :scale="1.2"
        :grid-mul="[2, 1]"
        :digit-size="1.5"
        :time-scale="0.3"
        :scanline-intensity="0.4"
        :glitch-amount="1.2"
        :flicker-amount="0.8"
        :noise-amp="1.2"
        :chromatic-aberration="2"
        :dither="0.5"
        :curvature="0.15"
        tint="#4f46e5"
        :mouse-react="true"
        :mouse-strength="0.3"
        :page-load-animation="true"
        :brightness="0.6"
      />
    </div>

    <!-- Gradient Overlay -->
    <div class="absolute inset-0 z-10 bg-gradient-to-b from-black/60 via-black/40 to-black/80"></div>

    <!-- Content -->
    <div class="relative z-20 h-full overflow-y-auto">
      <div class="min-h-screen flex flex-col">
        
        <!-- Welcome Animation -->
        <div 
          v-if="!showContent"
          class="flex-1 flex items-center justify-center"
        >
          <div class="text-center">
            <h1 class="text-6xl md:text-8xl font-bold mb-4">
              <EncryptedText
                text="WELCOME TO DIMENFLOW"
                encrypted-class-name="text-gray-600"
                revealed-class-name="text-white"
                :reveal-delay-ms="30"
              />
            </h1>
          </div>
        </div>

        <!-- Main Content -->
        <Transition
          enter-active-class="transition-all duration-1000 ease-out"
          enter-from-class="opacity-0 translate-y-10"
          enter-to-class="opacity-100 translate-y-0"
        >
          <div v-if="showContent" class="flex-1 flex flex-col">
            
            <!-- Hero Section -->
            <section class="flex-1 flex items-center justify-center px-6 py-20">
              <div class="max-w-6xl mx-auto text-center">
                <h1 class="text-7xl md:text-9xl font-black mb-6 tracking-tight">
                  <span class="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 animate-gradient">
                    DIMENFLOW
                  </span>
                </h1>
                <p class="text-3xl md:text-5xl font-bold text-white mb-4">
                  Transform Ideas into 3D Reality
                </p>
                <p class="text-xl md:text-2xl text-gray-300 mb-12 max-w-3xl mx-auto font-light">
                  AI-powered 3D scene generation that brings your imagination to life
                </p>
                
                <!-- CTA Buttons -->
                <div class="flex flex-col sm:flex-row gap-6 justify-center items-center">
                  <button
                    @click="emit('get-started')"
                    class="group relative px-12 py-5 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl text-xl font-bold text-white shadow-2xl shadow-indigo-500/50 hover:shadow-indigo-500/80 hover:scale-105 transition-all duration-300 overflow-hidden"
                  >
                    <div class="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <span class="relative flex items-center gap-3">
                      <span class="material-symbols-outlined text-2xl">rocket_launch</span>
                      Start Creating
                    </span>
                  </button>
                  
                  <button
                    @click="emit('skip-to-app')"
                    class="px-12 py-5 bg-white/10 backdrop-blur-sm border-2 border-white/20 rounded-xl text-xl font-bold text-white hover:bg-white/20 hover:border-white/40 transition-all duration-300"
                  >
                    View Demo
                  </button>
                </div>
              </div>
            </section>

            <!-- Features Section -->
            <section class="px-6 py-20 bg-gradient-to-b from-transparent via-black/40 to-transparent">
              <div class="max-w-7xl mx-auto">
                <h2 class="text-5xl md:text-6xl font-black text-center mb-4 text-white">
                  Powerful Features
                </h2>
                <p class="text-xl text-gray-400 text-center mb-16 max-w-2xl mx-auto">
                  Everything you need to create stunning 3D scenes
                </p>
                
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                  <Card3D
                    v-for="(feature, index) in features"
                    :key="index"
                  >
                    <Card3DItem :translate-z="50">
                      <div class="bg-gray-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-8 h-full hover:border-white/30 transition-all duration-300 group">
                        <Card3DItem :translate-z="75">
                          <div class="text-6xl mb-6 group-hover:scale-110 transition-transform duration-300">
                            {{ feature.icon }}
                          </div>
                        </Card3DItem>
                        
                        <Card3DItem :translate-z="60">
                          <h3 class="text-2xl font-bold mb-4 text-white">
                            {{ feature.title }}
                          </h3>
                        </Card3DItem>
                        
                        <Card3DItem :translate-z="40">
                          <p class="text-gray-400 leading-relaxed">
                            {{ feature.description }}
                          </p>
                        </Card3DItem>
                        
                        <Card3DItem :translate-z="30" class="mt-6">
                          <div :class="`h-1 w-20 rounded-full bg-gradient-to-r ${feature.gradient}`"></div>
                        </Card3DItem>
                      </div>
                    </Card3DItem>
                  </Card3D>
                </div>
              </div>
            </section>

            <!-- What Makes Us Different -->
            <section class="px-6 py-20">
              <div class="max-w-5xl mx-auto">
                <h2 class="text-5xl md:text-6xl font-black text-center mb-16 text-white">
                  Why DIMENFLOW?
                </h2>
                
                <div class="space-y-8">
                  <Card3D>
                    <Card3DItem :translate-z="40">
                      <div class="bg-gradient-to-r from-indigo-900/40 to-purple-900/40 backdrop-blur-xl border border-indigo-500/30 rounded-2xl p-8">
                        <h3 class="text-3xl font-bold mb-4 text-indigo-300">🤖 AI-First Approach</h3>
                        <p class="text-xl text-gray-300 leading-relaxed">
                          Powered by Google's Gemini AI for intelligent scene understanding, object detection, and natural language processing. No manual modeling required.
                        </p>
                      </div>
                    </Card3DItem>
                  </Card3D>

                  <Card3D>
                    <Card3DItem :translate-z="40">
                      <div class="bg-gradient-to-r from-blue-900/40 to-cyan-900/40 backdrop-blur-xl border border-blue-500/30 rounded-2xl p-8">
                        <h3 class="text-3xl font-bold mb-4 text-blue-300">⚡ Real-Time Editing</h3>
                        <p class="text-xl text-gray-300 leading-relaxed">
                          Interactive bounding boxes, live scene modifications, and instant regeneration. See your changes come to life immediately.
                        </p>
                      </div>
                    </Card3DItem>
                  </Card3D>

                  <Card3D>
                    <Card3DItem :translate-z="40">
                      <div class="bg-gradient-to-r from-emerald-900/40 to-teal-900/40 backdrop-blur-xl border border-emerald-500/30 rounded-2xl p-8">
                        <h3 class="text-3xl font-bold mb-4 text-emerald-300">🎯 Complete Workflow</h3>
                        <p class="text-xl text-gray-300 leading-relaxed">
                          From ideation to 3D models in one platform. Generate, edit, convert to 3D, and export - all in a seamless workflow.
                        </p>
                      </div>
                    </Card3DItem>
                  </Card3D>
                </div>
              </div>
            </section>

            <!-- Final CTA -->
            <section class="px-6 py-20 bg-gradient-to-t from-black/60 to-transparent">
              <div class="max-w-4xl mx-auto text-center">
                <h2 class="text-5xl md:text-7xl font-black mb-6 text-white">
                  Ready to Create?
                </h2>
                <p class="text-2xl text-gray-300 mb-12">
                  Join the future of 3D design
                </p>
                
                <button
                  @click="emit('get-started')"
                  class="group relative px-16 py-6 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl text-2xl font-bold text-white shadow-2xl shadow-purple-500/50 hover:shadow-purple-500/80 hover:scale-105 transition-all duration-300 overflow-hidden"
                >
                  <div class="absolute inset-0 bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <span class="relative flex items-center gap-3">
                    <span class="material-symbols-outlined text-3xl">auto_awesome</span>
                    Get Started Now
                  </span>
                </button>
              </div>
            </section>

            <!-- Footer -->
            <footer class="px-6 py-8 border-t border-white/10">
              <div class="max-w-7xl mx-auto text-center text-gray-500 text-sm">
                <p>© 2026 DIMENFLOW. Powered by AI. Built for Creators.</p>
              </div>
            </footer>

          </div>
        </Transition>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes gradient {
  0%, 100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
}

.animate-gradient {
  background-size: 200% 200%;
  animation: gradient 3s ease infinite;
}

/* Custom scrollbar */
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.3);
}

::-webkit-scrollbar-thumb {
  background: rgba(99, 102, 241, 0.5);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(99, 102, 241, 0.7);
}
</style>
