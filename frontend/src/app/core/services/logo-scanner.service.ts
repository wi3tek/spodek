import { Injectable } from '@angular/core';
import { BadgeShape, PatternType } from '../models/team.model';

export interface ScannedLogo {
  shapeType: BadgeShape;
  patternType: PatternType;
  primaryColor: string;
  secondaryColor: string;
  tertiaryColor: string;
  quaternaryColor: string;
  quinaryColor: string;
}

@Injectable({ providedIn: 'root' })
export class LogoScannerService {
  public scanImage(url: string): Promise<ScannedLogo> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        try {
          const result = this.extractShapeAndColors(img);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      };
      img.onerror = () => reject('Błąd wczytywania obrazka. Prawdopodobnie blokada CORS.');
      img.src = url;
    });
  }

  private extractShapeAndColors(img: HTMLImageElement): ScannedLogo {
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (!ctx) throw new Error('Brak kontekstu Canvas');

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const shape = this.detectSmartShape(imageData);
    const pattern = this.detectPattern(imageData);
    const colors = this.extractSpatialColors(imageData.data, canvas.width, canvas.height);

    return {
      shapeType: shape,
      patternType: pattern,
      primaryColor: colors.primary,
      secondaryColor: colors.secondary,
      tertiaryColor: colors.tertiary,
      quaternaryColor: colors.quaternary,
      quinaryColor: colors.quinary,
    };
  }

  private quantizeColor(r: number, g: number, b: number): string {
    if (r > 220 && g > 220 && b > 220) return '#ffffff';
    if (r < 35 && g < 35 && b < 35) return '#494949';
    const step = 32;
    return this.rgbToHex(
      Math.round(r / step) * step,
      Math.round(g / step) * step,
      Math.round(b / step) * step,
    );
  }

  private detectPattern(imageData: ImageData): PatternType {
    const data = imageData.data;
    const w = imageData.width;
    const h = imageData.height;

    const getChanges = (isVertical: boolean, fixedPos: number) => {
      let changes = 0;
      let lastHex = '';
      let streak = 0;
      const length = isVertical ? h : w;
      const start = Math.floor(length * 0.2);
      const end = Math.floor(length * 0.8);

      for (let i = start; i < end; i += 2) {
        const x = isVertical ? fixedPos : i;
        const y = isVertical ? i : fixedPos;
        const idx = (y * w + x) * 4;

        if (data[idx + 3] < 200) continue; // Ignoruj półprzezroczyste krawędzie
        const hex = this.quantizeColor(data[idx], data[idx + 1], data[idx + 2]);

        if (hex === lastHex) {
          streak++;
        } else {
          // Wymagamy dłuższego paska (min 4% szerokości/wysokości) aby uznać to za zmianę wzoru (eliminuje brudne krawędzie)
          if (streak > length * 0.04 && lastHex !== '') changes++;
          lastHex = hex;
          streak = 1;
        }
      }
      return changes;
    };

    const vChanges =
      (getChanges(false, Math.floor(h * 0.4)) + getChanges(false, Math.floor(h * 0.6))) / 2;
    const hChanges =
      (getChanges(true, Math.floor(w * 0.4)) + getChanges(true, Math.floor(w * 0.6))) / 2;

    if (vChanges >= 2 && hChanges >= 2) return 'CHECKER';
    if (vChanges >= 2 && hChanges <= 1.5) return 'STRIPES_V';
    if (hChanges >= 2 && vChanges <= 1.5) return 'STRIPES_H';
    if (vChanges > 0.5 || hChanges > 0.5) return 'SASH';
    return 'PLAIN';
  }

  private detectSmartShape(imageData: ImageData): BadgeShape {
    const data = imageData.data;
    const w = imageData.width;
    const h = imageData.height;

    let minX = w,
      maxX = 0,
      minY = h,
      maxY = 0;
    let solidPixels = 0;

    // 1. Znalezienie Bounding Boxa i policzenie widocznych pikseli
    for (let y = 0; y < h; y += 2) {
      for (let x = 0; x < w; x += 2) {
        if (data[(y * w + x) * 4 + 3] > 128) {
          solidPixels++;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    const boxWidth = maxX - minX;
    const boxHeight = maxY - minY;
    if (boxWidth <= 0 || boxHeight <= 0) return 'SHIELD';

    const aspectRatio = boxWidth / boxHeight;

    // Obliczenie współczynnika wypełnienia prostokąta
    const totalBoxPixels = (boxWidth / 2) * (boxHeight / 2);
    const fillRatio = solidPixels / totalBoxPixels;

    const getAvgWidth = (yStartPct: number, yEndPct: number) => {
      const startY = Math.floor(minY + boxHeight * yStartPct);
      const endY = Math.floor(minY + boxHeight * yEndPct);
      let totalW = 0,
        count = 0;
      for (let y = startY; y <= endY; y += 2) {
        let rMin = w,
          rMax = 0;
        for (let x = minX; x <= maxX; x += 2) {
          if (data[(y * w + x) * 4 + 3] > 128) {
            if (x < rMin) rMin = x;
            if (x > rMax) rMax = x;
          }
        }
        if (rMax >= rMin) {
          totalW += rMax - rMin;
          count++;
        }
      }
      return count > 0 ? totalW / count : 0;
    };

    const widthTop = getAvgWidth(0.02, 0.15);
    const widthMid = getAvgWidth(0.45, 0.55);
    const widthLowMid = getAvgWidth(0.7, 0.85);
    const widthBottomEdge = getAvgWidth(0.92, 1.0);

    // SZEROKIE LOGA (PSV, Flagi)
    if (aspectRatio > 1.2) {
      // Jeśli wypełnia prawie cały prostokąt, to jest to flaga. Jeśli rogów nie ma, to pozioma Elipsa (PSV).
      if (fillRatio > 0.85) return 'FLAG';
      return 'ELLIPSE';
    }

    // ROMB (Diament) - mało pikseli w rogach, wąski top i bottom
    if (fillRatio < 0.6 && widthTop < boxWidth * 0.4 && widthLowMid < boxWidth * 0.4) {
      return 'DIAMOND';
    }

    // WSTĘGA NA DOLE (West Ham)
    if (widthBottomEdge > widthLowMid * 1.15) {
      return 'CREST_WITH_RIBBON';
    }

    // TRÓJKĄTY
    if (widthTop > boxWidth * 0.85 && widthLowMid < boxWidth * 0.35) {
      if (aspectRatio > 1.0) return 'WIDE_TRIANGLE';
      return 'TRIANGLE';
    }

    // KOŁA I OWALE
    // Koło ma idealny Fill Ratio = Pi/4 (ok. 0.78) i zaokrąglone rogi (wąska góra i dół).
    if (widthTop < boxWidth * 0.75 && widthBottomEdge < boxWidth * 0.75) {
      if (aspectRatio >= 0.9 && aspectRatio <= 1.1) return 'CIRCLE';
      if (aspectRatio < 0.9) return 'OVAL_SHIELD'; // Pionowy owal (Milan)
      return 'ELLIPSE'; // Poziomy owal, ale nie na tyle szeroki co PSV (rzadkie, ale łapiemy to)
    }

    // KWADRATOWE TARCZE
    if (widthTop > widthMid * 0.9 && widthLowMid > widthMid * 0.85) {
      return 'SQUARE';
    }

    return 'SHIELD';
  }

  private extractSpatialColors(data: Uint8ClampedArray, width: number, height: number) {
    let minX = width,
      maxX = 0,
      minY = height,
      maxY = 0;
    for (let y = 0; y < height; y += 4) {
      for (let x = 0; x < width; x += 4) {
        if (data[(y * width + x) * 4 + 3] > 50) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const radiusX = (maxX - minX) / 2;
    const radiusY = (maxY - minY) / 2;

    const coreColors: Record<string, number> = {};
    const edgeColors: Record<string, number> = {};
    const accentCandidates: { hex: string; saturation: number }[] = [];

    for (let y = minY; y <= maxY; y += 3) {
      for (let x = minX; x <= maxX; x += 3) {
        const idx = (y * width + x) * 4;
        if (data[idx + 3] < 200) continue;

        const r = data[idx],
          g = data[idx + 1],
          b = data[idx + 2];
        const hex = this.quantizeColor(r, g, b);
        const diff = Math.max(r, g, b) - Math.min(r, g, b);

        if (diff > 40 && hex !== '#ffffff' && hex !== '#464646') {
          accentCandidates.push({ hex, saturation: diff });
        }

        const dx = (x - centerX) / (radiusX || 1);
        const dy = (y - centerY) / (radiusY || 1);
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 0.85) edgeColors[hex] = (edgeColors[hex] || 0) + 1;
        else coreColors[hex] = (coreColors[hex] || 0) + 1;
      }
    }

    const sortedEdge = Object.entries(edgeColors).sort((a, b) => b[1] - a[1]);
    const sortedCore = Object.entries(coreColors).sort((a, b) => b[1] - a[1]);

    const tertiary = sortedEdge.length > 0 ? sortedEdge[0][0] : '#464646';
    const selectedCoreHexes: string[] = [];

    for (const [hex] of sortedCore) {
      let isTooClose = false;
      if (this.colorDistance(hex, tertiary) < 60) isTooClose = true;
      if (!isTooClose) {
        for (const sel of selectedCoreHexes) {
          if (this.colorDistance(hex, sel) < 60) {
            isTooClose = true;
            break;
          }
        }
      }
      if (!isTooClose) selectedCoreHexes.push(hex);
      if (selectedCoreHexes.length >= 3) break;
    }

    let primary = selectedCoreHexes[0] || '#B0B0B0';
    let secondary = selectedCoreHexes[1] || primary;
    let quaternary = selectedCoreHexes[2] || '#ffffff';
    let quinary = '';

    accentCandidates.sort((a, b) => b.saturation - a.saturation);
    for (const acc of accentCandidates) {
      if (
        this.colorDistance(acc.hex, primary) > 50 &&
        this.colorDistance(acc.hex, secondary) > 50 &&
        this.colorDistance(acc.hex, tertiary) > 50 &&
        this.colorDistance(acc.hex, quaternary) > 50
      ) {
        quinary = acc.hex;
        break;
      }
    }

    if (!quinary) quinary = '#FFD700';
    return { primary, secondary, tertiary, quaternary, quinary };
  }

  private rgbToHex(r: number, g: number, b: number): string {
    return (
      '#' +
      [r, g, b]
        .map((x) => {
          const h = Math.min(255, Math.max(0, x)).toString(16);
          return h.length === 1 ? '0' + h : h;
        })
        .join('')
    );
  }

  private colorDistance(hex1: string, hex2: string): number {
    if (!hex1 || !hex2) return 0;
    const r1 = parseInt(hex1.substring(1, 3), 16);
    const g1 = parseInt(hex1.substring(3, 5), 16);
    const b1 = parseInt(hex1.substring(5, 7), 16);
    const r2 = parseInt(hex2.substring(1, 3), 16);
    const g2 = parseInt(hex2.substring(3, 5), 16);
    const b2 = parseInt(hex2.substring(5, 7), 16);
    return Math.sqrt(Math.pow(r1 - r2, 2) + Math.pow(g1 - g2, 2) + Math.pow(b1 - b2, 2));
  }
}
