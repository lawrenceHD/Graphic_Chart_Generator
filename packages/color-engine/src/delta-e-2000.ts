import type { Lab } from './types.js';

interface PolarLab extends Lab {
  readonly chroma: number;
  readonly hue: number;
}

interface DifferenceTerms {
  readonly lightness: number;
  readonly chroma: number;
  readonly hue: number;
  readonly rotation: number;
}

const TO_DEGREES = 180 / Math.PI;
const TO_RADIANS = Math.PI / 180;
const CHROMA_PIVOT = 25 ** 7;

export function deltaE2000(first: Lab, second: Lab): number {
  const meanChroma = (Math.hypot(first.a, first.b) + Math.hypot(second.a, second.b)) / 2;
  const adjustment = chromaAdjustment(meanChroma);
  const firstPolar = toPolar(first, adjustment);
  const secondPolar = toPolar(second, adjustment);
  const terms = differenceTerms(firstPolar, secondPolar);

  return combineDifferences(terms);
}

function chromaAdjustment(meanChroma: number): number {
  const power = meanChroma ** 7;
  return 0.5 * (1 - Math.sqrt(power / (power + CHROMA_PIVOT)));
}

function toPolar(lab: Lab, adjustment: number): PolarLab {
  const adjustedA = (1 + adjustment) * lab.a;
  const chroma = Math.hypot(adjustedA, lab.b);
  const hue = hueDegrees(adjustedA, lab.b);

  return { L: lab.L, a: adjustedA, b: lab.b, chroma, hue };
}

function hueDegrees(a: number, b: number): number {
  if (a === 0 && b === 0) return 0;
  return (Math.atan2(b, a) * TO_DEGREES + 360) % 360;
}

function differenceTerms(first: PolarLab, second: PolarLab): DifferenceTerms {
  const deltaLightness = second.L - first.L;
  const deltaChroma = second.chroma - first.chroma;
  const deltaHueDegrees = hueDifference(first, second);
  const deltaHue =
    2 * Math.sqrt(first.chroma * second.chroma) * Math.sin((deltaHueDegrees * TO_RADIANS) / 2);
  const meanLightness = (first.L + second.L) / 2;
  const meanChroma = (first.chroma + second.chroma) / 2;
  const meanHue = meanHueDegrees(first, second);

  return {
    lightness: deltaLightness / lightnessWeight(meanLightness),
    chroma: deltaChroma / chromaWeight(meanChroma),
    hue: deltaHue / hueWeight(meanChroma, meanHue),
    rotation: rotationTerm(meanChroma, meanHue),
  };
}

function hueDifference(first: PolarLab, second: PolarLab): number {
  if (first.chroma * second.chroma === 0) return 0;
  const difference = second.hue - first.hue;
  if (Math.abs(difference) <= 180) return difference;
  return difference > 180 ? difference - 360 : difference + 360;
}

function meanHueDegrees(first: PolarLab, second: PolarLab): number {
  if (first.chroma * second.chroma === 0) return first.hue + second.hue;
  const difference = Math.abs(first.hue - second.hue);
  const sum = first.hue + second.hue;
  if (difference <= 180) return sum / 2;
  return sum < 360 ? (sum + 360) / 2 : (sum - 360) / 2;
}

function lightnessWeight(mean: number): number {
  const offset = mean - 50;
  return 1 + (0.015 * offset ** 2) / Math.sqrt(20 + offset ** 2);
}

function chromaWeight(mean: number): number {
  return 1 + 0.045 * mean;
}

function hueWeight(meanChroma: number, meanHue: number): number {
  const radians = meanHue * TO_RADIANS;
  const trigonometric =
    1 -
    0.17 * Math.cos(radians - 30 * TO_RADIANS) +
    0.24 * Math.cos(2 * radians) +
    0.32 * Math.cos(3 * radians + 6 * TO_RADIANS) -
    0.2 * Math.cos(4 * radians - 63 * TO_RADIANS);
  return 1 + 0.015 * meanChroma * trigonometric;
}

function rotationTerm(meanChroma: number, meanHue: number): number {
  const hueDelta = 30 * Math.exp(-(((meanHue - 275) / 25) ** 2));
  const meanPower = meanChroma ** 7;
  const rotation = 2 * Math.sqrt(meanPower / (meanPower + CHROMA_PIVOT));
  return -Math.sin(2 * hueDelta * TO_RADIANS) * rotation;
}

function combineDifferences(terms: DifferenceTerms): number {
  const lightness = terms.lightness ** 2;
  const chroma = terms.chroma ** 2;
  const hue = terms.hue ** 2;
  return Math.sqrt(lightness + chroma + hue + terms.rotation * terms.chroma * terms.hue);
}
