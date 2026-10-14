import axios from 'axios';

export const api = axios.create({ baseURL: '/api' });

export const getUsers = () => api.get('/users');

export const getUser = (id: string) => api.get(`/users/${id}`);

export const createUser = (name: string) => api.post('/users', { name });

export const removeUser = (id: string) => api.delete(`/users/${id}`);
