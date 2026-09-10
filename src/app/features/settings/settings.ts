import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SettingsApi, BusinessSettings, Defaults } from '../../core/api/settings-api';
import { CategoriesApi } from '../../core/api/categories-api';
import { Toast } from '../../core/ui/toast';
import { Category } from '../../core/models';

@Component({
  selector: 'app-settings',
  imports: [FormsModule],
  templateUrl: './settings.html',
})
export class Settings {
  private api = inject(SettingsApi);
  private categoriesApi = inject(CategoriesApi);
  private toast = inject(Toast);

  tab = signal<'negocio' | 'categorias'>('negocio');
  loading = signal(true);
  saving = signal(false);

  business = signal<BusinessSettings | null>(null);
  defaults = signal<Defaults | null>(null);
  categories = signal<Category[]>([]);

  newCategory = signal('');

  constructor() {
    this.load();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      const [settings, cats] = await Promise.all([this.api.get(), this.categoriesApi.list()]);
      this.business.set(settings.business);
      this.defaults.set(settings.defaults);
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
      this.toast.success('Datos guardados.');
    } catch (err) {
      this.toast.fromHttpError(err);
    } finally {
      this.saving.set(false);
    }
  }

  async addCategory(): Promise<void> {
    const name = this.newCategory().trim();
    if (!name) return;

    try {
      await this.categoriesApi.create({ name });
      this.toast.success('Categoría creada.');
      this.newCategory.set('');
      const cats = await this.categoriesApi.list();
      this.categories.set(cats.data);
    } catch (err) {
      this.toast.fromHttpError(err);
    }
  }

  async removeCategory(cat: Category): Promise<void> {
    if (!confirm(`¿Eliminar la categoría "${cat.name}"?`)) return;

    try {
      await this.categoriesApi.remove(cat.id);
      this.toast.success('Categoría eliminada.');
      const cats = await this.categoriesApi.list();
      this.categories.set(cats.data);
    } catch (err) {
      this.toast.fromHttpError(err);
    }
  }
}
