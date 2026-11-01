<script setup lang="ts">
import { useRouter } from 'vue-router';
const router = useRouter();
</script>

<template>
  <div class="text-center py-16 animate-fade-in">
    <div class="w-20 h-20 rounded-2xl bg-aris-surface flex items-center justify-center mx-auto mb-6">
      <span class="text-4xl font-bold text-aris-muted font-mono">404</span>
    </div>
    <h1 class="text-2xl font-bold text-aris-white mb-2">Halaman Tidak Ditemukan</h1>
    <p class="text-sm text-aris-muted mb-6">Halaman yang Anda cari tidak ada atau telah dipindahkan.</p>
    <div class="flex gap-3 justify-center">
      <button @click="router.back()" class="btn-secondary">← Kembali</button>
      <router-link to="/" class="btn-primary">Ke Beranda</router-link>
    </div>
  </div>
</template>
