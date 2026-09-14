import { OverridePolicy } from './staffing.models';

export function isJustificationRequired(
  forecastDemand: number,
  correctedDemand: number,
  policy: OverridePolicy,
): boolean {
  const deviation = Math.abs(correctedDemand - forecastDemand);
  if (forecastDemand === 0) {
    return correctedDemand !== 0;
  }
  const relative = deviation / forecastDemand;
  return (
    deviation >= policy.absoluteJustificationThreshold ||
    relative >= policy.relativeJustificationThreshold
  );
}

export function hasAtMostTwoDecimalPlaces(value: number): boolean {
  const scaled = Math.round(value * 100);
  return Math.abs(value * 100 - scaled) < 1e-8;
}

export function validateOverrideInput(
  forecastDemand: number,
  correctedDemand: number | null,
  justification: string,
  policy: OverridePolicy,
): { correctedDemand?: string; justification?: string } {
  const errors: { correctedDemand?: string; justification?: string } = {};

  if (correctedDemand === null || Number.isNaN(correctedDemand)) {
    errors.correctedDemand = 'Enter a valid demand value.';
    return errors;
  }

  if (correctedDemand < 0) {
    errors.correctedDemand = 'Demand cannot be negative.';
  } else if (!hasAtMostTwoDecimalPlaces(correctedDemand)) {
    errors.correctedDemand = 'Demand may have at most two decimal places.';
  }

  const trimmed = justification.trim();
  if (isJustificationRequired(forecastDemand, correctedDemand, policy) && !trimmed) {
    errors.justification = 'Provide a justification for this correction.';
  }
  if (trimmed.length > 500) {
    errors.justification = 'Justification must be at most 500 characters.';
  }

  return errors;
}
