import {
  hasAtMostTwoDecimalPlaces,
  isJustificationRequired,
  validateOverrideInput,
} from './staffing.validators';

const policy = {
  absoluteJustificationThreshold: 2,
  relativeJustificationThreshold: 0.2,
};

describe('staffing.validators', () => {
  it('detects justification thresholds', () => {
    expect(isJustificationRequired(10, 11.99, policy)).toBe(false);
    expect(isJustificationRequired(10, 12, policy)).toBe(true);
    expect(isJustificationRequired(5, 6, policy)).toBe(true);
    expect(isJustificationRequired(0, 0, policy)).toBe(false);
    expect(isJustificationRequired(0, 1, policy)).toBe(true);
  });

  it('validates decimal precision', () => {
    expect(hasAtMostTwoDecimalPlaces(1.25)).toBe(true);
    expect(hasAtMostTwoDecimalPlaces(1.234)).toBe(false);
  });

  it('returns field errors for invalid override input', () => {
    expect(validateOverrideInput(10, null, '', policy).correctedDemand).toBeTruthy();
    expect(validateOverrideInput(10, -1, '', policy).correctedDemand).toContain('negative');
    expect(validateOverrideInput(10, 1.234, 'ok', policy).correctedDemand).toContain('decimal');
    expect(validateOverrideInput(10, 13, '  ', policy).justification).toBeTruthy();
    expect(validateOverrideInput(10, 10.5, 'x'.repeat(501), policy).justification).toContain('500');
    expect(validateOverrideInput(10, 10.5, 'ok', policy)).toEqual({});
  });
});
