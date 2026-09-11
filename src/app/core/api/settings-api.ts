import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

export interface BusinessSettings {
  id: number;
  name: string;
  ruc: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  logo_path: string | null;
  estab: string;
  pto_emision: string;
  sri_environment: 'pruebas' | 'produccion';
}

export interface Defaults {
  margin_main: number;
  margin_alt: number;
  card_fee_pct: number;
  iva_rate: number;
  calc_order: 'discount_first' | 'fee_first';
  require_cash_session: boolean;
}

export interface SettingsResponse {
  business: BusinessSettings;
  defaults: Defaults;
  factory: Defaults;
}

@Injectable({ providedIn: 'root' })
export class SettingsApi {
  private http = inject(HttpClient);

  get(): Promise<SettingsResponse> {
    return firstValueFrom(this.http.get<SettingsResponse>('/api/settings'));
  }

  update(payload: {
    business?: Partial<BusinessSettings>;
    settings?: Partial<Defaults>;
  }): Promise<{ message: string; business: BusinessSettings; defaults: Defaults }> {
    return firstValueFrom(this.http.put<any>('/api/settings', payload));
  }

  /* ============ Respaldo ============ */

  exportBackup(): Promise<unknown> {
    return firstValueFrom(this.http.get('/api/backup/export'));
  }

  importBackup(payload: unknown): Promise<{ message: string }> {
    return firstValueFrom(
      this.http.post<{ message: string }>('/api/backup/import', {
        confirm: 'REEMPLAZAR',
        payload,
      })
    );
  }

  reset(scope: 'ventas' | 'todo'): Promise<{ message: string }> {
    return firstValueFrom(
      this.http.post<{ message: string }>('/api/backup/reset', {
        confirm: 'BORRAR',
        scope,
      })
    );
  }
}
