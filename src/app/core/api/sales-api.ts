import { inject, Injectable } from '@angular/core';
import { DocType, Paginated, PaymentMethod, Sale, Wrapped } from '../models';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface CreateSalePayload {
  items: { product_id: number; qty: number }[];
  margin_pct?: number;
  discount_cents?: number;
  payment_method: PaymentMethod;
  doc_type: DocType;
  received_cents?: number;
  override_total_cents?: number;
  override_reason?: string;
  customer?: { name?: string; ident?: string; email?: string };
}

export interface SalesQuery {
  search?: string;
  method?: string;
  status?: string;
  /** Formato YYYY-MM-DD o fecha completa */
  from?: string;
  to?: string;
  per_page?: number;
}

@Injectable({ providedIn: 'root' })
export class SalesApi {
  private http = inject(HttpClient);

  list(query: SalesQuery = {}): Promise<Paginated<Sale>> {
    let params = new HttpParams();
    if (query.search) params = params.set('search', query.search);
    if (query.method) params = params.set('method', query.method);
    if (query.status) params = params.set('status', query.status);
    if (query.from) params = params.set('from', query.from);
    if (query.to) params = params.set('to', query.to);
    params = params.set('per_page', String(query.per_page ?? 25));

    return firstValueFrom(this.http.get<Paginated<Sale>>('/api/sales', { params }));
  }

  /** Todas las ventas de un día. `date` en formato YYYY-MM-DD. */
  listByDay(date: string): Promise<Paginated<Sale>> {
    return this.list({
      from: `${date} 00:00:00`,
      to: `${date} 23:59:59`,
      per_page: 100,
    });
  }

  get(id: number): Promise<Wrapped<Sale>> {
    return firstValueFrom(this.http.get<Wrapped<Sale>>(`/api/sales/${id}`));
  }

  create(payload: CreateSalePayload): Promise<Wrapped<Sale>> {
    return firstValueFrom(this.http.post<Wrapped<Sale>>('/api/sales', payload));
  }

  void(id: number, reason: string): Promise<{ message: string; sale: Sale }> {
    return firstValueFrom(
      this.http.post<any>(`/api/sales/${id}/void`, { reason, restore_stock: true })
    );
  }
}
