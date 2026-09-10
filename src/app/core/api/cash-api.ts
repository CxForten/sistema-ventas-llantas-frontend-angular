import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { CashSession, CashSummary } from '../models';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root'})
export class CashApi {
    private http = inject(HttpClient);

    current(): Promise<{data: CashSession | null; live?: CashSummary}> {
        return firstValueFrom(this.http.get<any>('/api/cash-sessions/current'));
    }
    
    open(opening_cents: number, notes?: string): Promise<{data: CashSession}> {
        return firstValueFrom(this.http.post<any>('/api/cash-sessions/open', {opening_cents, notes}));
    }
    
    close(counted_cents: number, notes?: string): Promise<{message:string; data: CashSession; summary: CashSummary;}>{
        return firstValueFrom(this.http.post<any>('/api/cash-sessions/close', {counted_cents, notes}))
    }


}
