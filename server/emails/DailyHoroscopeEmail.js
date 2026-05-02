import { createElement as h } from 'react';
import { render } from '@react-email/render';
import {
  Html, Head, Body, Preview, Container,
  Section, Text, Button, Hr, Link,
} from '@react-email/components';

const C = {
  bg: '#080816',
  card: '#0d0b28',
  card2: '#100e30',
  purple: '#7c3aed',
  purpleLight: '#9f67fa',
  gold: '#d4a017',
  goldLight: '#f0c040',
  textPrimary: '#e8e0ff',
  textSecondary: '#9b8ec4',
  textMuted: '#5c5480',
  border: '#1e1b4b',
};

const SIGN_SYMBOLS = {
  Aries: '♈', Taurus: '♉', Gemini: '♊', Cancer: '♋',
  Leo: '♌', Virgo: '♍', Libra: '♎', Scorpio: '♏',
  Sagittarius: '♐', Capricorn: '♑', Aquarius: '♒', Pisces: '♓',
};

const MOON_PHASE_ICONS = {
  new_moon: '🌑', waxing_crescent: '🌒', first_quarter: '🌓',
  waxing_gibbous: '🌔', full_moon: '🌕', waning_gibbous: '🌖',
  last_quarter: '🌗', waning_crescent: '🌘',
};

function HoroscopeSection({ label, text, accent }) {
  return h(Section, {
    style: {
      background: C.card2,
      borderRadius: '8px',
      padding: '14px 18px',
      marginBottom: '10px',
      borderLeft: `3px solid ${accent ?? C.purple}`,
    },
  },
    h(Text, { style: { fontSize: '11px', fontWeight: 'bold', color: accent ?? C.purpleLight, margin: '0 0 5px', letterSpacing: '1px', textTransform: 'uppercase' } },
      label
    ),
    h(Text, { style: { fontSize: '14px', color: C.textPrimary, margin: '0', lineHeight: '1.6' } }, text)
  );
}

function DailyHoroscopeEmail({
  displayName = 'Cosmic Seeker',
  sunSign = 'Aries',
  dateLabel = 'Today',
  content = {},
  moonPhase = null,
}) {
  const signSymbol = SIGN_SYMBOLS[sunSign] ?? '✦';
  const moonIcon = moonPhase ? (MOON_PHASE_ICONS[moonPhase] ?? '🌙') : '🌙';
  const overview = content.overview ?? '';
  const previewText = overview.length > 90 ? overview.slice(0, 90) + '…' : overview;

  return h(Html, { lang: 'en' },
    h(Head, null),
    h(Preview, null, previewText || `Your ${sunSign} horoscope for ${dateLabel}`),
    h(Body, { style: { backgroundColor: C.bg, margin: '0', padding: '0', fontFamily: 'Georgia, serif' } },
      h(Container, { style: { maxWidth: '600px', margin: '0 auto', padding: '0 24px 40px' } },

        // Logo bar
        h(Section, { style: { padding: '32px 0 0', textAlign: 'center' } },
          h(Text, { style: { fontSize: '22px', fontWeight: 'bold', color: C.purpleLight, margin: '0', letterSpacing: '2px' } },
            '✦ AstroOracle'
          ),
          h(Text, { style: { fontSize: '11px', color: C.textMuted, margin: '4px 0 0', letterSpacing: '3px', textTransform: 'uppercase' } },
            'Daily Cosmic Reading'
          )
        ),

        // Hero
        h(Section, {
          style: {
            background: 'linear-gradient(135deg, #0d0033 0%, #0a1840 50%, #0d0033 100%)',
            borderRadius: '12px',
            padding: '40px 32px',
            textAlign: 'center',
            border: `1px solid ${C.border}`,
            marginTop: '24px',
          },
        },
          // Date
          h(Text, { style: { fontSize: '13px', color: C.textMuted, margin: '0 0 8px', letterSpacing: '2px', textTransform: 'uppercase' } },
            dateLabel
          ),
          // Sign symbol + moon phase
          h(Text, { style: { fontSize: '44px', margin: '0 0 4px', lineHeight: '1' } },
            `${signSymbol} ${moonIcon}`
          ),
          h(Text, { style: { fontSize: '22px', fontWeight: 'bold', color: C.textPrimary, margin: '8px 0 0' } },
            `${sunSign} Horoscope`
          ),
          h(Text, { style: { fontSize: '13px', color: C.textSecondary, margin: '6px 0 0' } },
            `Personal reading for ${displayName}`
          )
        ),

        // Overview
        h(Section, { style: { padding: '28px 0 8px' } },
          content.overview && h(Text, { style: { fontSize: '15px', color: C.textPrimary, lineHeight: '1.75', margin: '0', fontStyle: 'italic' } },
            `"${content.overview}"`
          )
        ),

        // Sections
        h(Section, { style: { paddingTop: '12px' } },
          content.love && h(HoroscopeSection, { label: 'Love & Relationships', text: content.love, accent: '#ec4899' }),
          content.career && h(HoroscopeSection, { label: 'Career & Purpose', text: content.career, accent: C.purpleLight }),
          content.wellness && h(HoroscopeSection, { label: 'Health & Wellness', text: content.wellness, accent: '#22c55e' })
        ),

        // Cosmic Advice
        content.cosmicAdvice && h(Section, {
          style: {
            background: 'linear-gradient(135deg, #1a0533 0%, #0d1b4a 100%)',
            borderRadius: '8px',
            padding: '20px 24px',
            border: `1px solid ${C.border}`,
            textAlign: 'center',
            margin: '4px 0 28px',
          },
        },
          h(Text, { style: { fontSize: '11px', color: C.gold, margin: '0 0 8px', letterSpacing: '2px', textTransform: 'uppercase' } },
            'Cosmic Advice'
          ),
          h(Text, { style: { fontSize: '16px', color: C.goldLight, margin: '0', lineHeight: '1.5', fontStyle: 'italic' } },
            `"${content.cosmicAdvice}"`
          )
        ),

        // CTA
        h(Section, { style: { textAlign: 'center', padding: '0 0 32px' } },
          h(Button, {
            href: 'https://astrooracle.space',
            style: {
              backgroundColor: C.purple,
              color: '#ffffff',
              padding: '13px 32px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 'bold',
              textDecoration: 'none',
            },
          }, 'Read Full Report in AstroOracle →')
        ),

        h(Hr, { style: { border: 'none', borderTop: `1px solid ${C.border}`, margin: '0' } }),

        // Footer
        h(Section, { style: { padding: '24px 0', textAlign: 'center' } },
          h(Text, { style: { fontSize: '12px', color: C.textMuted, margin: '0 0 6px' } },
            '✦ AstroOracle — Cosmic Knowledge AI'
          ),
          h(Text, { style: { fontSize: '12px', color: C.textMuted, margin: '0' } },
            'You\'re receiving daily horoscopes based on your notification preferences. ',
            h(Link, { href: 'https://astrooracle.space/settings#notifications', style: { color: C.textMuted, textDecoration: 'underline' } }, 'Manage preferences'),
            ' · ',
            h(Link, { href: 'https://astrooracle.space/settings#notifications', style: { color: C.textMuted, textDecoration: 'underline' } }, 'Unsubscribe')
          )
        )
      )
    )
  );
}

export async function renderDailyHoroscopeEmail(props = {}) {
  return render(h(DailyHoroscopeEmail, props));
}

export const dailyHoroscopeEmailSubject = (sunSign, dateLabel) =>
  `${SIGN_SYMBOLS[sunSign] ?? '✦'} Your ${sunSign} Horoscope — ${dateLabel}`;
