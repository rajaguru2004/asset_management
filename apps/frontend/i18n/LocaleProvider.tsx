'use client';

import { useEffect, useMemo, type ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { useLocaleStore, type Locale } from '@/store/localeStore';
import enMessages from '@/messages/en';
import arMessages from '@/messages/ar';

const MESSAGES: Record<Locale, typeof enMessages> = {
  en: enMessages,
  ar: arMessages,
};

export function directionForLocale(locale: Locale): 'ltr' | 'rtl' {
  return locale === 'ar' ? 'rtl' : 'ltr';
}

interface LocaleProviderProps {
  children: ReactNode;
}

/**
 * Reads the active locale from Zustand, applies lang/dir to <html> reactively
 * and provides translated messages to the subtree.
 */
export function LocaleProvider({ children }: LocaleProviderProps) {
  const locale = useLocaleStore((s) => s.locale);
  const messages = useMemo(() => MESSAGES[locale], [locale]);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = directionForLocale(locale);
  }, [locale]);

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
