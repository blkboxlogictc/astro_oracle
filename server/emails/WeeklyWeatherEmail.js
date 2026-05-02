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
  green: '#22c55e',
  red: '#f87171',
};

function WeeklyWeatherEmail({
  displayName = 'Cosmic Seeker',
  weekLabel = 'This Week',
  content = {},
  isPremium = false,
}) {
  const themes = content.themes ?? [];
  const keyEvents = content.keyEvents ?? [];
  const bestDays = content.bestDays ?? [];
  const challengingDays = content.challengingDays ?? [];

  return h(Html, { lang: 'en' },
    h(Head, null),
    h(Preview, null, content.headline ?? `Your cosmic weather for ${weekLabel}`),
    h(Body, { style: { backgroundColor: C.bg, margin: '0', padding: '0', fontFamily: 'Georgia, serif' } },
      h(Container, { style: { maxWidth: '600px', margin: '0 auto', padding: '0 24px 40px' } },

        // Masthead
        h(Section, {
          style: {
            borderBottom: `2px solid ${C.gold}`,
            paddingBottom: '16px',
            marginTop: '32px',
            textAlign: 'center',
          },
        },
          h(Text, { style: { fontSize: '11px', color: C.textMuted, margin: '0 0 6px', letterSpacing: '4px', textTransform: 'uppercase' } },
            '✦ AstroOracle'
          ),
          h(Text, { style: { fontSize: '20px', fontWeight: 'bold', color: C.gold, margin: '0 0 4px', letterSpacing: '1px' } },
            'Weekly Cosmic Weather'
          ),
          h(Text, { style: { fontSize: '12px', color: C.textMuted, margin: '0', letterSpacing: '2px', textTransform: 'uppercase' } },
            weekLabel
          )
        ),

        // Headline
        content.headline && h(Section, { style: { padding: '28px 0 0', textAlign: 'center' } },
          h(Text, { style: { fontSize: '22px', fontWeight: 'bold', color: C.textPrimary, margin: '0', lineHeight: '1.3' } },
            content.headline
          )
        ),

        // Overview
        content.overview && h(Section, { style: { padding: '20px 0 8px' } },
          h(Text, { style: { fontSize: '15px', color: C.textSecondary, lineHeight: '1.75', margin: '0' } },
            content.overview
          )
        ),

        // Themes
        themes.length > 0 && h(Section, { style: { padding: '16px 0 8px' } },
          h(Text, { style: { fontSize: '11px', color: C.gold, margin: '0 0 10px', letterSpacing: '2px', textTransform: 'uppercase' } },
            'This Week\'s Themes'
          ),
          h(Section, { style: { display: 'block' } },
            ...themes.map((theme, i) =>
              h(Text, {
                key: i,
                style: {
                  display: 'inline-block',
                  fontSize: '12px',
                  color: C.purpleLight,
                  background: '#1a103a',
                  border: `1px solid ${C.border}`,
                  borderRadius: '20px',
                  padding: '4px 12px',
                  margin: '0 6px 6px 0',
                },
              }, theme)
            )
          )
        ),

        h(Hr, { style: { border: 'none', borderTop: `1px solid ${C.border}`, margin: '24px 0' } }),

        // Key Events
        keyEvents.length > 0 && h(Section, null,
          h(Text, { style: { fontSize: '13px', fontWeight: 'bold', color: C.textPrimary, margin: '0 0 14px', letterSpacing: '1px', textTransform: 'uppercase' } },
            'Cosmic Events This Week'
          ),
          ...keyEvents.map((e, i) =>
            h(Section, {
              key: i,
              style: {
                background: C.card,
                borderRadius: '8px',
                padding: '14px 18px',
                marginBottom: '10px',
                borderLeft: `3px solid ${C.purple}`,
              },
            },
              h(Text, { style: { fontSize: '12px', color: C.purpleLight, margin: '0 0 3px', fontWeight: 'bold' } },
                e.day
              ),
              h(Text, { style: { fontSize: '14px', color: C.textPrimary, margin: '0 0 4px', fontWeight: 'bold' } },
                e.event
              ),
              h(Text, { style: { fontSize: '13px', color: C.textSecondary, margin: '0', lineHeight: '1.5' } },
                e.meaning
              )
            )
          )
        ),

        // Premium transit section
        isPremium && h(Section, {
          style: {
            background: '#120c00',
            borderRadius: '8px',
            padding: '20px 24px',
            border: '1px solid #3d2c00',
            margin: '20px 0',
          },
        },
          h(Text, { style: { fontSize: '13px', fontWeight: 'bold', color: C.goldLight, margin: '0 0 10px', letterSpacing: '1px', textTransform: 'uppercase' } },
            '⭐ Your Personal Transits This Week'
          ),
          h(Text, { style: { fontSize: '13px', color: '#c8aa60', margin: '0', lineHeight: '1.6' } },
            'Open AstroOracle to see how this week\'s planetary movements interact with your birth chart for personalized guidance.'
          )
        ),

        h(Hr, { style: { border: 'none', borderTop: `1px solid ${C.border}`, margin: '20px 0' } }),

        // Best / Challenging days
        (bestDays.length > 0 || challengingDays.length > 0) && h(Section, { style: { marginBottom: '24px' } },
          h(Text, { style: { fontSize: '13px', fontWeight: 'bold', color: C.textPrimary, margin: '0 0 14px', letterSpacing: '1px', textTransform: 'uppercase' } },
            'Day Guide'
          ),
          bestDays.length > 0 && h(Section, {
            style: { background: '#081408', borderRadius: '8px', padding: '12px 16px', marginBottom: '10px', borderLeft: `3px solid ${C.green}` },
          },
            h(Text, { style: { fontSize: '12px', color: C.green, margin: '0 0 4px', fontWeight: 'bold' } }, 'Best Days'),
            h(Text, { style: { fontSize: '14px', color: C.textPrimary, margin: '0' } }, bestDays.join(' · '))
          ),
          challengingDays.length > 0 && h(Section, {
            style: { background: '#160808', borderRadius: '8px', padding: '12px 16px', borderLeft: `3px solid ${C.red}` },
          },
            h(Text, { style: { fontSize: '12px', color: C.red, margin: '0 0 4px', fontWeight: 'bold' } }, 'Navigate with Care'),
            h(Text, { style: { fontSize: '14px', color: C.textPrimary, margin: '0' } }, challengingDays.join(' · '))
          )
        ),

        // Weekly Advice
        content.advice && h(Section, {
          style: {
            background: 'linear-gradient(135deg, #1a0533 0%, #0d1b4a 100%)',
            borderRadius: '8px',
            padding: '20px 24px',
            border: `1px solid ${C.border}`,
            textAlign: 'center',
            marginBottom: '32px',
          },
        },
          h(Text, { style: { fontSize: '11px', color: C.gold, margin: '0 0 8px', letterSpacing: '2px', textTransform: 'uppercase' } },
            'Cosmic Advice for the Week'
          ),
          h(Text, { style: { fontSize: '16px', color: C.goldLight, margin: '0', lineHeight: '1.5', fontStyle: 'italic' } },
            `"${content.advice}"`
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
          }, 'Explore the Full Forecast →')
        ),

        h(Hr, { style: { border: 'none', borderTop: `1px solid ${C.border}`, margin: '0' } }),

        // Footer
        h(Section, { style: { padding: '24px 0', textAlign: 'center' } },
          h(Text, { style: { fontSize: '12px', color: C.textMuted, margin: '0 0 6px' } },
            '✦ AstroOracle — Weekly Cosmic Weather'
          ),
          h(Text, { style: { fontSize: '12px', color: C.textMuted, margin: '0' } },
            'Delivered every Monday. ',
            h(Link, { href: 'https://astrooracle.space/settings#notifications', style: { color: C.textMuted, textDecoration: 'underline' } }, 'Manage preferences'),
            ' · ',
            h(Link, { href: 'https://astrooracle.space/settings#notifications', style: { color: C.textMuted, textDecoration: 'underline' } }, 'Unsubscribe')
          )
        )
      )
    )
  );
}

export async function renderWeeklyWeatherEmail(props = {}) {
  return render(h(WeeklyWeatherEmail, props));
}

export const weeklyWeatherEmailSubject = (weekLabel) =>
  `🌌 AstroOracle Weekly Cosmic Weather — ${weekLabel}`;
