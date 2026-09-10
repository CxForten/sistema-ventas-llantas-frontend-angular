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
  calc_order: string;
}

export interface SettingsResponse {
  business: BusinessSettings;
  defaults: Defaults;
  settings: Record<string, unknown>;
}

@Injectable({providedIn: 'root'})
export class SettingsApi {
    private http = inject(HttpClient);

    get(): Promise<SettingsResponse>{
        return firstValueFrom(this.http.get<SettingsResponse>('/api/settings'));
    }

    update(payload: {
        business?: Partial<BusinessSettings>;
        settings?: Record<string, unknown>;
    }): Promise<{message: string; business: BusinessSettings; settings: Record<string, unknown>}> {
        return firstValueFrom(this.http.put<any>('/api/settings', payload))
    }
}
