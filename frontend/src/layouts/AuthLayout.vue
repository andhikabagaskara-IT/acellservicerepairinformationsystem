<script setup lang="ts">
// Auth Layout — dark background with glassmorphism centered card
</script>

<template>
  <div class="min-h-screen bg-aris-black flex items-center justify-center p-4 relative overflow-hidden">
    <!-- Background Effects -->
    <div class="absolute inset-0 grid-bg opacity-40"></div>
    <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-glow-radial pointer-events-none"></div>
    
    <!-- Floating Orbs -->
    <div class="absolute top-20 left-20 w-32 h-32 bg-neon-500/5 rounded-full blur-3xl animate-pulse-neon"></div>
    <div class="absolute bottom-32 right-32 w-48 h-48 bg-neon-500/3 rounded-full blur-3xl animate-pulse-neon" style="animation-delay: 1.5s;"></div>

    <!-- Content -->
    <div class="relative z-10 w-full max-w-md animate-fade-in">
      <slot />
    </div>
  </div>
</template>
