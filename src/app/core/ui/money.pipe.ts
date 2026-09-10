import { Pipe, PipeTransform } from '@angular/core';
import { Money } from './money';

@Pipe({
  name: 'money',
})
export class MoneyPipe implements PipeTransform {
  transform(cents: number | null | undefined): string {
    return Money.display(cents ?? 0)
  }
}
