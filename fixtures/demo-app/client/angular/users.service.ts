import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

interface User {
  id: string;
  name: string;
}

@Injectable({ providedIn: 'root' })
export class UsersService {
  constructor(private readonly http: HttpClient) {}

  list(): Observable<User[]> {
    return this.http.get<User[]>('/api/users');
  }

  create(name: string): Observable<User> {
    return this.http.post<User>('/api/users', { name });
  }

  listOrders(): Observable<unknown[]> {
    return this.http.get<unknown[]>('/api/orders');
  }
}
