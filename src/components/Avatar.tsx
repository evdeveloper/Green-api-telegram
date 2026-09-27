/**
 * Аватар-заглушка. Фотографий у нас нет (по ТЗ только текст), поэтому
 * показываем инициалы на цвете, детерминированно выведенном из chatId —
 * так один и тот же собеседник всегда одного цвета, и чаты различимы
 * в списке с первого взгляда.
 */

/**
 * Оттенки для фона аватара. Светлота 32% выбрана по расчёту контраста:
 * при более светлом фоне белые инициалы не добирают до WCAG AA на жёлтом
 * и зелёном оттенках.
 */
const HUES = [212, 262, 340, 16, 150, 190, 280, 42];

function hashCode(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function initials(source: string): string {
  const trimmed = source.trim();
  if (!trimmed) return '?';

  // Имя: берём первые буквы первых двух слов.
  if (/\p{L}/u.test(trimmed)) {
    const words = trimmed.split(/\s+/).slice(0, 2);
    return words.map((w) => w[0]?.toUpperCase() ?? '').join('');
  }

  // Номер телефона: две последние цифры — они различают собеседников лучше всего.
  const digits = trimmed.replace(/\D/g, '');
  return digits.slice(-2) || '?';
}

interface AvatarProps {
  /** Ключ для выбора цвета — стабильный идентификатор чата. */
  seed: string;
  /** Имя или номер, из которого берутся инициалы. */
  label: string;
  size?: 'sm' | 'md';
}

export function Avatar({ seed, label, size = 'md' }: AvatarProps) {
  const hue = HUES[hashCode(seed) % HUES.length];
  const dimension = size === 'sm' ? 'size-9 text-detail' : 'size-12 text-title';

  return (
    <span
      aria-hidden="true"
      className={`${dimension} grid shrink-0 place-items-center rounded-full font-medium text-white`}
      style={{ backgroundColor: `hsl(${hue} 62% 32%)` }}
    >
      {initials(label)}
    </span>
  );
}
