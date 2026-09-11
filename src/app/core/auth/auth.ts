import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { User } from '../models';
import { firstValueFrom } from 'rxjs';

const TOKEN_KEY = 'mp_token';
const USER_KEY = 'mp_user';

@Injectable({ providedIn: 'root'})
export class Auth {
    private http = inject (HttpClient);
    private router = inject (Router);

    readonly token = signal<string | null>(localStorage.getItem(TOKEN_KEY));
    readonly user = signal<User | null>(this.readStoredUser());

    readonly isLoggedIn = computed(() => this.token() !== null);
    readonly businessName = computed(() => this.user()?.business?.name ?? 'Motor Planet')
    readonly initials = computed (() => {
        const name = this.user()?.name ?? '';
        return name.trim().charAt(0).toUpperCase() || '?';
    });

    can(permission: string): boolean {
        const perms = this.user()?.permissions ?? [];
        return perms.includes('*') || perms.includes(permission);
    }

    async login(email: string, password: string): Promise<void> {
        const res = await firstValueFrom(
            this.http.post<{ token: string; user: User}>('/api/login', {email, password})
        );
        
        localStorage.setItem(TOKEN_KEY, res.token);
        localStorage.setItem(USER_KEY, JSON.stringify(res.user));
        this.token.set(res.token);
        this.user.set(res.user);
    }

    async logout(): Promise<void> {
        try {
            await firstValueFrom(this.http.post('/api/logout', {}));
        } catch {

        }

        this.clear();
        this.router.navigate(['/login'])
    }

    clear(): void {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        this.token.set(null);
        this.user.set(null);
    }

    private readStoredUser(): User | null {
        const raw = localStorage.getItem(USER_KEY);
        if (!raw) return null;
        try {return JSON.parse(raw) as User; } catch {return null;}
    }

    async refresh(): Promise<void> {
    if (!this.token()) return;

    try {
      const res = await firstValueFrom(this.http.get<{ data: User }>('/api/me'));
      localStorage.setItem(USER_KEY, JSON.stringify(res.data));
      this.user.set(res.data);
    } catch {
      // Si falla, seguimos con lo que hay guardado en localStorage
    }
  }
}
