import { Pipe, PipeTransform, inject } from '@angular/core';
import { LanguageService } from '../services/language.service';

@Pipe({
  name: 'translate',
  standalone: true,
  pure: false // Impure because it needs to react to signal changes from service without arguments changing
})
export class TranslatePipe implements PipeTransform {
  private languageService = inject(LanguageService);

  transform(value: string): string {
    return this.languageService.getTranslation(value);
  }
}
