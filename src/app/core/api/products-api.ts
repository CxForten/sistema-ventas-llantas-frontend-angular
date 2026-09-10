import { HttpClient, HttpParams } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { Paginated, Product, StockMovement, Wrapped } from "../models";
import { firstValueFrom } from "rxjs";

export interface ProductQuery {
    search?: string;
    category_id?: number | null;
    low_stock?: boolean;
    per_page?: number;
}

@Injectable({providedIn: 'root'})
export class ProductsApi {
    private http = inject(HttpClient);

    list(query: ProductQuery = {}): Promise<Paginated<Product>> {
        let params = new HttpParams();
        if (query.search) params = params.set('search', query.search);
        if (query.category_id) params = params.set('category_id', query.category_id);
        if (query.low_stock) params = params.set('low_stock', '1');
        params = params.set('per_page', String(query.per_page ?? 100));

        return firstValueFrom(this.http.get<Paginated<Product>>('/api/products', {params}));
    }

    get(id: number): Promise<Wrapped<Product>> {
        return firstValueFrom(this.http.get<Wrapped<Product>>(`/api/products/${id}`));
    }

    create (data: Partial<Product>): Promise<Wrapped<Product>> {
        return firstValueFrom(this.http.post<Wrapped<Product>>('/api/products', data))
    }

    
    update(id: number, data: Partial<Product>): Promise<Wrapped<Product>> {
        return firstValueFrom(this.http.put<Wrapped<Product>>(`/api/products/${id}`, data));
    }

    
    remove(id: number): Promise<unknown> {
        return firstValueFrom(this.http.delete(`/api/products/${id}`));
    }
    
    kardex(id: number): Promise<Paginated<StockMovement>> {
        return firstValueFrom(this.http.get<Paginated<StockMovement>>(`/api/products/${id}/kardex`));
    }

    adjustStock(data: {
        product_id: number;
        type: 'entrada' | 'salida' | 'ajuste';
        qty: number;
        reason: string;
    }): Promise<{message: string; movement: StockMovement; product: Product}> {
        return firstValueFrom(this.http.post<any>('/api/stock/adjust', data))
    }
}
