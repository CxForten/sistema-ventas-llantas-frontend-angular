import { inject, Injectable } from '@angular/core';
import { DashboardData, DashboardTotals } from '../models';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface DateRange { from?: string; to?: string; }

export interface SalesReport {
  from: string;
  to: string;
  totals: DashboardTotals;
  by_method: { method: string; sales_count: number; total_cents: number }[];
  by_category: { category: string; qty: number; total_cents: number }[];
}

export interface TopProduct { sku: string; name: string; qty: number; total_cents: number; }
export interface TopSpec { spec: string; qty: number; }

@Injectable({providedIn: 'root'})
export class ReportsApi {
    private http = inject(HttpClient);

    dashboard(): Promise<DashboardData> {
        return firstValueFrom(this.http.get<DashboardData>('/api/reports/dashboard'));
    }

    sales(range: DateRange = {}): Promise<SalesReport> {
        return firstValueFrom(this.http.get<SalesReport>('/api/reports/sales', {params: this.toParams(range)}));
    }

    topProducts(range: DateRange = {} , limit = 10): Promise<{data: TopProduct[]}> {
        return firstValueFrom(this.http.get<{data: TopProduct[]}>('/api/reports/top-products', {params: this.toParams(range).set('limit', String(limit)),

        })
    );
}

    topSpec(range: DateRange = {}, limit = 10): Promise <{ data: TopSpec[]}> {
        return firstValueFrom(this.http.get<{ data: TopSpec[]}> ('/api/reports/top-specs', { params: this.toParams(range).set('limit', String(limit)),
        })
    );
    }

    private toParams(range: DateRange): HttpParams {
        let params = new HttpParams();
        if (range.from) params = params.set('from', range.from);
        if (range.to) params = params.set('to', range.to);
        return params;
    }
}
