import { SettingsApi } from './../../core/api/settings-api';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { MoneyPipe } from '../../core/ui/money.pipe';
import { ProductsApi } from '../../core/api/products-api';
import { CategoriesApi } from '../../core/api/categories-api';
import { Toast } from '../../core/ui/toast';
import { Auth } from '../../core/auth/auth';
import { Category, Product, StockMovement } from '../../core/models';
import { Money } from '../../core/ui/money';

@Component({
  selector: 'app-products',
  imports: [FormsModule, MoneyPipe, DatePipe],
  templateUrl: './products.html',
})
export class Products {
  private api = inject(ProductsApi);
  private categoriesApi = inject(CategoriesApi);
  private toast = inject(Toast);
  private settingsApi = inject(SettingsApi);
  auth = inject(Auth);

  products = signal<Product[]>([]);
  categories = signal<Category[]>([]);
  loading = signal(true);
  search = signal('');
  categoryFilter = signal<number | null>(null);

  /* --- Modal de producto --- */
  editing = signal<Product | null>(null);
  modalOpen = signal(false);
  saving = signal(false);
  form = signal({
    sku: '',
    name: '',
    brand: '',
    spec: '',
    category_id: null as number | null,
    cost: '',
    stock: 0,
    document_date: '',
    document_number: '',
  });

  /* --- Modal de ajuste de inventario --- */
  adjustOpen = signal(false);
  adjustProduct = signal<Product | null>(null);
  adjustForm = signal({ type: 'entrada' as 'entrada' | 'salida' | 'ajuste', qty: 0, reason: '', document_date: '', document_number: '', });

  /* --- Modal de kardex --- */
  kardexOpen = signal(false);
  kardexProduct = signal<Product | null>(null);
  movements = signal<StockMovement[]>([]);

   marginMain = signal(25);
  marginAlt = signal(20);
 
  private async loadMargins(): Promise<void> {
    try {
      const res = await this.settingsApi.get();
      this.marginMain.set(res.defaults.margin_main);
      this.marginAlt.set(res.defaults.margin_alt);
    } catch {
      // Quedan 25 y 20 por defecto
    }
  }
 
  readonly canSeeCost = computed(() => this.auth.can('products.cost'));
  
  readonly previewMain = computed(() =>
      Money.withMargin(Money.toCents(this.form().cost), this.marginMain())
    );
 
  readonly previewAlt = computed(() =>
    Money.withMargin(Money.toCents(this.form().cost), this.marginAlt())
  );
 
  constructor() {
    this.loadCategories();
    this.loadMargins();

    effect(() => {
      const search = this.search();
      const categoryId = this.categoryFilter();
      this.load(search, categoryId);
    });
  }

  private async load(search: string, categoryId: number | null): Promise<void> {
    this.loading.set(true);
    try {
      const res = await this.api.list({ search, category_id: categoryId });
      this.products.set(res.data);
    } catch (err) {
      this.toast.fromHttpError(err, 'No se pudo cargar el inventario.');
    } finally {
      this.loading.set(false);
    }
  }

  private async loadCategories(): Promise<void> {
    try {
      const res = await this.categoriesApi.list();
      this.categories.set(res.data);
    } catch (err) {
      this.toast.fromHttpError(err, 'No se pudieron cargar las categorías.');
    }
  }

  reload(): void {
    this.load(this.search(), this.categoryFilter());
  }

  /* ============ Crear / editar ============ */

  openNew(): void {
    this.editing.set(null);
    this.form.set({
      sku: '',
      name: '',
      brand: '',
      spec: '',
      category_id: this.categories()[0]?.id ?? null,
      cost: '',
      stock: 0,
      document_date: this.hoy(),
      document_number: '',
    });
    this.modalOpen.set(true);
  }

  openEdit(product: Product): void {
    this.editing.set(product);
    this.form.set({
      sku: product.sku,
      name: product.name,
      brand: product.brand ?? '',
      spec: product.spec ?? '',
      category_id: product.category_id,
      cost: Money.format(product.cost_cents ?? 0),
      stock: product.stock,
      document_date: '',
      document_number: '',
    });
    this.modalOpen.set(true);
  }

  patch(key: string, value: unknown): void {
    this.form.update((f) => ({ ...f, [key]: value }));
  }

  async save(): Promise<void> {
    if (this.saving()) return;

    const f = this.form();

    if (!f.name.trim()) {
      this.toast.error('El nombre del producto es obligatorio.');
      return;
    }
    if (!f.sku.trim()) {
      this.toast.error('El SKU es obligatorio.');
      return;
    }
    if (Money.toCents(f.cost) <= 0) {
      this.toast.error('Ingresa el precio de costo.');
      return;
    }

    const payload: Record<string, unknown> = {
      sku: f.sku.trim(),
      name: f.name.trim(),
      brand: f.brand.trim() || null,
      spec: f.spec.trim() || null,
      category_id: f.category_id,
      cost_cents: Money.toCents(f.cost),
      active: true,
      track_stock: true,
    };

    // El stock solo al crear. Al editar se cambia por ajuste de inventario.
    if (!this.editing()) {
      payload['stock'] = f.stock;

      if (f.stock > 0) {
        payload['document_date'] = f.document_date || null;
        payload['document_number'] = f.document_number.trim() || null;
      }
      
    }

    this.saving.set(true);
    try {
      const current = this.editing();
      if (current) {
        await this.api.update(current.id, payload);
        this.toast.success('Producto actualizado.');
      } else {
        await this.api.create(payload);
        this.toast.success('Producto creado.');
      }
      this.modalOpen.set(false);
      this.reload();
    } catch (err) {
      this.toast.fromHttpError(err);
    } finally {
      this.saving.set(false);
    }
  }

  async remove(product: Product): Promise<void> {
    if (!confirm(`¿Eliminar "${product.name}"? El historial de ventas no se pierde.`)) return;

    try {
      await this.api.remove(product.id);
      this.toast.success('Producto eliminado.');
      this.reload();
    } catch (err) {
      this.toast.fromHttpError(err);
    }
  }

  /* ============ Ajuste de inventario ============ */

  openAdjust(product: Product): void {
    this.adjustProduct.set(product);
    this.adjustForm.set({ type: 'entrada', qty: 0, reason: '', document_date: new Date().toISOString().slice(0,10), document_number: '', });
    this.adjustOpen.set(true);
  }

  patchAdjust(key: string, value: unknown): void {
    this.adjustForm.update((f) => ({ ...f, [key]: value }));
  }

  async saveAdjust(): Promise<void> {
    const product = this.adjustProduct();
    const f = this.adjustForm();

    if (!product) return;
    if (f.reason.trim().length < 3) {
      this.toast.error('Escribe el motivo del movimiento.');
      return;
    }

    try {
      const res = await this.api.adjustStock({
        product_id: product.id,
        type: f.type,
        qty: f.qty,
        reason: f.reason.trim(),
        document_date: f.type === 'entrada' ? (f.document_date || null) : null,
        document_number: f.type === 'entrada' ? (f.document_number.trim() || null): null,
      });
      this.toast.success(`Inventario actualizado. Stock: ${res.product.stock}`);
      this.adjustOpen.set(false);
      this.reload();
    } catch (err) {
      this.toast.fromHttpError(err);
    }
  }

  /* ============ Kardex ============ */

  async openKardex(product: Product): Promise<void> {
    this.kardexProduct.set(product);
    this.movements.set([]);
    this.kardexOpen.set(true);

    try {
      const res = await this.api.kardex(product.id);
      this.movements.set(res.data);
    } catch (err) {
      this.toast.fromHttpError(err, 'No se pudo cargar el kardex.');
    }
  }

  movementLabel(type: string): string {
    const labels: Record<string, string> = {
      entrada: 'Entrada',
      salida: 'Salida',
      ajuste: 'Ajuste',
      venta: 'Venta',
      anulacion: 'Anulación',
    };
    return labels[type] ?? type;
  }

  hoy(): string {
    return new Date().toISOString().slice(0, 10);
  }

  
}
