import { HttpClient, HttpParams } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { Paginated, StockMovement } from "../models";
import { firstValueFrom } from "rxjs";

export type MovementType = 'entrada' | 'salida' | 'ajuste' | 'venta' | 'anulacion';

export interface MovementQuery {
    search?: string;
    type?: MovementType | null;
    product_id?: number | null;
    from?: string;
    to?: string;
    page?: number;
    per_page?: number
}

@Injectable({ providedIn: 'root'})
export class StockApi {
    private http = inject(HttpClient);

    movements(query: MovementQuery = {}): Promise<Paginated<StockMovement>> {
        let params = new HttpParams();
        if (query.search) params = params.set('search', query.search);
        if (query.type) params = params.set('type', query.type);
        if (query.product_id) params = params.set('product_id', query.product_id);
        if (query.from) params = params.set('from', query.from);
        if (query.to) params = params.set('to', query.to);
        if (query.page) params = params.set('page', query.page);
        params = params.set('per_page', String(query.per_page ?? 50));

        return firstValueFrom (this.http.get<Paginated<StockMovement>>('/api/stock/movements', {params}))
    }
}