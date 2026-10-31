import { ArabicDigitsPipe } from './arabic-digits.pipe';
import { fromArabicDigits, toArabicDigits } from '../utils/arabic-digits';

describe('ArabicDigitsPipe', () => {
  const pipe = new ArabicDigitsPipe();

  it('turns Western digits into Arabic-Indic ones', () => {
    expect(pipe.transform(286)).toBe('٢٨٦');
    expect(pipe.transform('2:255')).toBe('٢:٢٥٥');
    expect(pipe.transform(0)).toBe('٠');
  });

  it('is empty for null/undefined', () => {
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform(undefined)).toBe('');
  });

  it('round-trips through fromArabicDigits', () => {
    expect(fromArabicDigits(toArabicDigits('114:6'))).toBe('114:6');
    expect(fromArabicDigits('سورة ٣٠')).toBe('سورة 30');
  });
});
