import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class CommonService {
  getLogoUrl(url: string | null | undefined): string {
    if (!url) return '/logo.png';
    if (url.startsWith('http') || url.startsWith('data:') || url.startsWith('/')) {
      return url;
    }
    return '/' + url;
  }

  onImageError(event: Event) {
    const img = event.target as HTMLImageElement;
    if (!img.src.includes('/logo.png')) {
      img.src = '/logo.png';
    }
  }
}
