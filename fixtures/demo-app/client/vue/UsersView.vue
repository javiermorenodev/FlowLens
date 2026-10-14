<template>
  <div>
    <span v-for="user in users" :key="user.id">{{ user.name }}</span>
    <button @click="remove('1')">Borrar</button>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import axios from 'axios';

const users = ref<unknown[]>([]);

onMounted(async () => {
  const response = await fetch('/api/products/7');
  users.value = await response.json();
});

const remove = (id: string) => axios.delete(`/api/users/${id}`);

const loadTasks = () => axios.get('/api/tasks');
</script>
