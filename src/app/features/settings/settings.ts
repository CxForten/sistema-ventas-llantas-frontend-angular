import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SettingsApi, BusinessSettings, Defaults } from '../../core/api/settings-api';
import { CategoriesApi } from '../../core/api/categories-api';
import { SalesApi } from '../../core/api/sales-api';
import { ProductsApi } from '../../core/api/products-api';
import { StockApi } from '../../core/api/stock-api';
import { Toast } from '../../core/ui/toast';
import { Auth } from '../../core/auth/auth';
import { Csv } from '../../core/ui/csv';
import { Money } from '../../core/ui/money';
import { Category } from '../../core/models';

type Tab = 'precios' | 'negocio' | 'categorias' | 'datos';

@Component({
  selector: 'app-settings',
  imports: [FormsModule],
  templateUrl: './settings.html',
})
export class Settings {
  private api = inject(SettingsApi);
  private categoriesApi = inject(CategoriesApi);
  private salesApi = inject(SalesApi);
  private productsApi = inject(ProductsApi);
  private stockApi = inject(StockApi);
  private toast = inject(Toast);
  auth = inject(Auth);

  tab = signal<Tab>('precios');
  loading = signal(true);
  saving = signal(false);
  working = signal('');

  business = signal<BusinessSettings | null>(null);
  defaults = signal<Defaults | null>(null);
  factory = signal<Defaults | null>(null);

  categories = signal<Category[]>([]);
  newCategory = signal('');

  /* --- Confirmación de borrado --- */
  resetOpen = signal(false);
  resetScope = signal<'ventas' | 'todo'>('ventas');
  resetConfirm = signal('');

  /**
   * Vista previa con un costo de $100. Es la forma más rápida de que el dueño
   * entienda qué significan los porcentajes que está escribiendo.
   */
  readonly preview = computed(() => {
    const d = this.defaults();
    if (!d) return null;

    const cost = 10000;
    const main = Money.withMargin(cost, d.margin_main);
    const alt = Money.withMargin(cost, d.margin_alt);
    const card = main + Math.round((main * d.card_fee_pct) / 100);

    return {
      main: Money.display(main),
      alt: Money.display(alt),
      card: Money.display(card),
    };
  });

  constructor() {
    this.load();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      const [res, cats] = await Promise.all([
        this.api.get(),
        this.categoriesApi.list(),
      ]);

      this.business.set(res.business);
      this.defaults.set(res.defaults);
      this.factory.set(res.factory);
      this.categories.set(cats.data);
    } catch (err) {
      this.toast.fromHttpError(err, 'No se pudo cargar la configuración.');
    } finally {
      this.loading.set(false);
    }
  }

  patchBusiness(key: string, value: string): void {
    this.business.update((b) => (b ? { ...b, [key]: value } : b));
  }

  patchDefaults(key: string, value: unknown): void {
    this.defaults.update((d) => (d ? { ...d, [key]: value } : d));
  }

  /* ============ Guardar ============ */

  async savePrices(): Promise<void> {
    const d = this.defaults();
    if (!d || this.saving()) return;

    this.saving.set(true);
    try {
      const res = await this.api.update({
        settings: {
          margin_main: d.margin_main,
          margin_alt: d.margin_alt,
          card_fee_pct: d.card_fee_pct,
          calc_order: d.calc_order,
        },
      });
      this.defaults.set(res.defaults);
      this.toast.success('Porcentajes guardados. Los precios se recalculan al vender.');
    } catch (err) {
      this.toast.fromHttpError(err);
    } finally {
      this.saving.set(false);
    }
  }

  async saveBusiness(): Promise<void> {
    const b = this.business();
    if (!b || this.saving()) return;

    this.saving.set(true);
    try {
      await this.api.update({
        business: {
          name: b.name,
          ruc: b.ruc,
          address: b.address,
          phone: b.phone,
          email: b.email,
        },
      });
      await this.auth.refresh();
      this.toast.success('Datos del negocio guardados.');
    } catch (err) {
      this.toast.fromHttpError(err);
    } finally {
      this.saving.set(false);
    }
  }

  /* ============ Categorías ============ */

  async addCategory(): Promise<void> {
    const name = this.newCategory().trim();
    if (!name) return;

    try {
      await this.categoriesApi.create({ name, active: true });
      this.newCategory.set('');
      await this.reloadCategories();
      this.toast.success('Categoría creada.');
    } catch (err) {
      this.toast.fromHttpError(err);
    }
  }

  async removeCategory(cat: Category): Promise<void> {
    if (!confirm(`¿Eliminar la categoría "${cat.name}"?`)) return;

    try {
      await this.categoriesApi.remove(cat.id);
      await this.reloadCategories();
      this.toast.success('Categoría eliminada.');
    } catch (err) {
      this.toast.fromHttpError(err);
    }
  }

  private async reloadCategories(): Promise<void> {
    const cats = await this.categoriesApi.list();
    this.categories.set(cats.data);
  }

  /* ============ Respaldo ============ */

  async exportBackup(): Promise<void> {
    this.working.set('backup');
    try {
      const data = await this.api.exportBackup();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `respaldo-${Csv.today()}.json`;
      link.click();
      URL.revokeObjectURL(url);

      this.toast.success('Respaldo descargado. Guárdalo fuera de este computador.');
    } catch (err) {
      this.toast.fromHttpError(err, 'No se pudo generar el respaldo.');
    } finally {
      this.working.set('');
    }
  }

  async onBackupFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const ok = confirm(
      'Esto reemplaza TODOS los datos actuales por los del archivo. ' +
        'Lo que hay ahora se pierde. ¿Continuar?'
    );

    if (!ok) {
      input.value = '';
      return;
    }

    this.working.set('restore');
    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      const res = await this.api.importBackup(payload);
      this.toast.success(res.message);
      await this.load();
    } catch (err) {
      this.toast.fromHttpError(err, 'El archivo no es un respaldo válido.');
    } finally {
      this.working.set('');
      input.value = '';
    }
  }

  /* ============ Exportar a Excel ============ */

  async exportSales(): Promise<void> {
    this.working.set('ventas');
    try {
      const res = await this.salesApi.list({ per_page: 5000 });
      const verCostos = this.auth.can('products.cost');

      Csv.download(
        `ventas-${Csv.today()}.csv`,
        [
          'Venta', 'Fecha', 'Cliente', 'Método', 'Estado',
          'Total cobrado', 'Ingreso del negocio', 'Recargo tarjeta',
          ...(verCostos ? ['Costo', 'Margen bruto'] : []),
        ],
        res.data.map((s) => [
          s.number,
          new Date(s.sold_at).toLocaleString('es-EC'),
          s.customer_name,
          s.payment_method,
          s.status,
          Csv.money(s.total_cents),
          Csv.money(s.business_income_cents),
          Csv.money(s.card_fee_cents),
          ...(verCostos ? [Csv.money(s.cost_total_cents), Csv.money(s.gross_margin_cents)] : []),
        ])
      );
      this.toast.success(`${res.data.length} ventas exportadas.`);
    } catch (err) {
      this.toast.fromHttpError(err);
    } finally {
      this.working.set('');
    }
  }

  async exportProducts(): Promise<void> {
    this.working.set('productos');
    try {
      const res = await this.productsApi.list({ per_page: 2000 });
      const verCostos = this.auth.can('products.cost');

      Csv.download(
        `inventario-${Csv.today()}.csv`,
        [
          'Producto', 'Código', 'Marca', 'Medida', 'Categoría',
          ...(verCostos ? ['Costo'] : []),
          'Precio', 'Stock',
        ],
        res.data.map((p) => [
          p.name,
          p.sku,
          p.brand ?? '',
          p.spec ?? '',
          p.category_name ?? '',
          ...(verCostos ? [Csv.money(p.cost_cents)] : []),
          Csv.money(p.price_cents),
          p.stock,
        ])
      );
      this.toast.success(`${res.data.length} productos exportados.`);
    } catch (err) {
      this.toast.fromHttpError(err);
    } finally {
      this.working.set('');
    }
  }

  async exportMovements(): Promise<void> {
    this.working.set('kardex');
    try {
      const res = await this.stockApi.movements({ per_page: 5000 });

      Csv.download(
        `entradas-salidas-${Csv.today()}.csv`,
        ['Fecha', 'Producto', 'Código', 'Tipo', 'Cantidad', 'Antes', 'Después', 'Motivo', 'Quién'],
        res.data.map((m) => [
          new Date(m.created_at).toLocaleString('es-EC'),
          m.product?.name ?? '',
          m.product?.sku ?? '',
          m.type,
          m.qty,
          m.stock_before,
          m.stock_after,
          m.reason ?? '',
          m.user ?? '',
        ])
      );
      this.toast.success(`${res.data.length} movimientos exportados.`);
    } catch (err) {
      this.toast.fromHttpError(err);
    } finally {
      this.working.set('');
    }
  }

  /* ============ Borrar datos ============ */

  openReset(scope: 'ventas' | 'todo'): void {
    this.resetScope.set(scope);
    this.resetConfirm.set('');
    this.resetOpen.set(true);
  }

  async confirmReset(): Promise<void> {
    if (this.resetConfirm().trim().toUpperCase() !== 'BORRAR') return;

    this.working.set('reset');
    try {
      const res = await this.api.reset(this.resetScope());
      this.toast.success(res.message);
      this.resetOpen.set(false);
      await this.load();
    } catch (err) {
      this.toast.fromHttpError(err);
    } finally {
      this.working.set('');
    }
  }
}