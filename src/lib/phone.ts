/** Нормализация и валидация телефонных номеров получателя. */

/** Оставляет только цифры и приводит российский формат 8XXXXXXXXXX к 7XXXXXXXXXX. */
export function normalizePhone(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('8')) {
    return `7${digits.slice(1)}`;
  }
  return digits;
}

/**
 * Проверка длины по E.164: от 7 до 15 цифр.
 * Конкретную страну не валидируем — получатель может быть где угодно.
 */
export function isValidPhone(input: string): boolean {
  const digits = normalizePhone(input);
  return digits.length >= 7 && digits.length <= 15;
}

/** Человекочитаемый вид: +7 999 123-45-67 для РФ, +<digits> для остальных. */
export function formatPhone(input: string): string {
  const d = normalizePhone(input);
  if (d.length === 11 && d.startsWith('7')) {
    return `+7 ${d.slice(1, 4)} ${d.slice(4, 7)}-${d.slice(7, 9)}-${d.slice(9)}`;
  }
  return d ? `+${d}` : '';
}

/** Инициалы для аватара-заглушки: две последние цифры номера. */
export function phoneInitials(input: string): string {
  const d = normalizePhone(input);
  return d.slice(-2) || '??';
}
