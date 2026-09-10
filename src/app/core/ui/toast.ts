import { Injectable, signal } from '@angular/core';

export interface ToastMessage {
    id: number;
    text: string;
    kind: 'success' | 'error' | 'info';
}

@Injectable({ providedIn: 'root' })
export class Toast {
    readonly messages = signal<ToastMessage[]>([]);
    private nextId = 1;
    
    success(text: string) {this.push(text, 'success');}
    error(text: string) {this.push(text, 'error');}
    info(text: string) {this.push(text, 'info');}

    fromHttpError(err: any, fallback = 'No se pudo completar la operación. ') {
        const body = err?.error;

        if (body?.errors) {
            const first = Object.values(body.errors)[0];
            if (Array.isArray(first) && first.length) {
                this.error(String(first[0]));
                return;
            }
        }

        this.error(body?.message ?? fallback);
    }

    private push(text: string, kind: ToastMessage['kind']) {
        const id = this.nextId++;
        this.messages.update((list) => [...list, { id, text, kind}]);
        setTimeout(() => {
            this.messages.update((list) => list.filter((m) => m.id !== id));
        }, 3200)
    }

}
