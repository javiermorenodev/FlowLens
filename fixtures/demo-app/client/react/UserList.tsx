import { useEffect, useState } from 'react';
import axios from 'axios';
import { useQuery } from '@tanstack/react-query';

interface User {
  id: string;
  name: string;
}

export function UserList() {
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    fetch('/api/users')
      .then((response) => response.json())
      .then(setUsers);
  }, []);

  const { data } = useQuery({
    queryKey: ['orders'],
    queryFn: () => fetch('/api/orders').then((response) => response.json()),
  });

  const taskQuery = useQuery({
    queryKey: ['tasks'],
    queryFn: () => axios.get('/api/tasks').then((response) => response.data),
  });

  const createUser = () =>
    axios.post('/api/users', { name: 'Ana' }).then((response) => response.data);

  const loadOrder = () => axios.get('/api/orders/42').then((response) => response.data);

  const removeUser = (id: string) => axios.delete(`/api/users/${id}`);

  return (
    <ul>
      {users.map((user) => (
        <li key={user.id}>{user.name}</li>
      ))}
      {data ? <span>{data.length}</span> : null}
      {taskQuery.data ? <span>{taskQuery.data.length}</span> : null}
      <button type="button" onClick={createUser}>
        Crear
      </button>
      <button type="button" onClick={loadOrder}>
        Orden
      </button>
      <button type="button" onClick={() => removeUser('1')}>
        Borrar
      </button>
    </ul>
  );
}
