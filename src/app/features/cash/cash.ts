import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { CashApi } from '../../core/api/cash-api';
import { Toast } from '../../core/ui/toast';
import { MoneyPipe } from '../../core/ui/money.pipe';
import { Money } from '../../core/ui/money';
import { Auth } from '../../core/auth/auth';
import { CashSession, CashSummary } from '../../core/models';

@Component({
  selector: 'app-cash',
  imports: [FormsModule, MoneyPipe, DatePipe],
  templateUrl: './cash.html',
})
export class Cash {
  private api = inject(CashApi);
  private toast = inject(Toast);
  auth = inject(Auth);

  session = signal<CashSession | null>(null);
  summary = signal<CashSummary | null>(null);
  loading = signal(true);
  busy = signal(false);

  openingInput = signal('');
  countedInput = signal('');
  notes = signal('');

  readonly isOpen = computed(() => this.session()?.status === 'open');

  /** Diferencia en vivo mientras el cajero teclea el conteo. */
  readonly liveDifference = computed(() => {
    const counted = this.countedInput();
    const expected = this.summary()?.expected_cents;
    if (counted === '' || expected === undefined) return null;
    return Money.toCents(counted) - expected;
  });

  constructor() {
    this.refresh();
  }

  async refresh(): Promise<void> {
    this.loading.set(true);
    try {
      const res = await this.api.current();
      this.session.set(res.data);
      this.summary.set(res.live ?? null);
    } catch (err) {
      this.toast.fromHttpError(err, 'No se pudo consultar la caja.');
    } finally {
      this.loading.set(false);
    }
  }

  async open(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);

    try {
      await this.api.open(Money.toCents(this.openingInput()), this.notes() || undefined);
      this.toast.success('Caja abierta.');
      this.openingInput.set('');
      this.notes.set('');
      await this.refresh();
    } catch (err) {
      this.toast.fromHttpError(err);
    } finally {
      this.busy.set(false);
    }
  }

  async close(): Promise<void> {
    if (this.busy()) return;

    if (this.countedInput() === '') {
      this.toast.error('Cuenta el efectivo del cajón y escribe el total.');
      return;
    }

    this.busy.set(true);
    try {
      const res = await this.api.close(Money.toCents(this.countedInput()), this.notes() || undefined);
      const diff = res.data.difference_cents ?? 0;

      if (diff === 0) {
        this.toast.success('Caja cerrada. Cuadra exacto.');
      } else if (diff > 0) {
        this.toast.info(`Caja cerrada. Sobran ${Money.display(diff)}.`);
      } else {
        this.toast.error(`Caja cerrada. Faltan ${Money.display(Math.abs(diff))}.`);
      }

      this.countedInput.set('');
      this.notes.set('');
      await this.refresh();
    } catch (err) {
      this.toast.fromHttpError(err);
    } finally {
      this.busy.set(false);
    }
  }
}
