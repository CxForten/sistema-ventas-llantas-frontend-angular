import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Category, Wrapped } from '../models';
import { firstValueFrom } from 'rxjs';

@Injectable({providedIn: 'root'})
export class CategoriesApi {
    private http = inject(HttpClient);

    list(): Promise<{ data: Category[]}> {
        return firstValueFrom(this.http.get<{data: Category[]} > ('/api/categories'));
    }

    create(data: Partial<Category>): Promise<Wrapped<Category>> {
            return firstValueFrom(this.http.post<Wrapped<Category>>('/api/categories', {
                active: true,
                sort_order: 0,
                ...data,
            })
        )
    }

    update(id: number, data: Partial<Category>): Promise<Wrapped<Category>>{
        return firstValueFrom(this.http.put<Wrapped<Category>>(`/api/categories/${id}`, data));
    }

    remove(id:number): Promise <{message: string}> {
        return firstValueFrom(this.http.delete<{message: string}>(`/api/categories/${id}`));
    }
}
