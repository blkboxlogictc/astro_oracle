import { createElement as h } from 'react';
import { render } from '@react-email/render';
import {
  Html, Head, Body, Preview, Container,
  Section, Text, Button, Hr, Link,
} from '@react-email/components';

const C = {
  bg: '#080816',
  card: '#0d0b28',
  cardGold: '#120c00',
  purple: '#7c3aed',
  purpleLight: '#9f67fa',
  gold: '#d4a017',
  goldLight: '#f0c040',
  goldBorder: '#3d2c00',
  textPrimary: '#e8e0ff',
  textSecondary: '#9b8ec4',
  textMuted: '#5c5480',
  border: '#1e1b4b',
};

const PREMIUM_FEATURES = [
  { icon: '🔭', title: 'Full Natal Birth Chart', body: 'Complete planetary positions, house placements, and aspect interpretations calculated to the minute.' },
  { icon: '🌟', title: 'Personalized Daily Transits', body: 'Daily horoscopes personalized to your exact birth chart — not just your sun sign.' },
  { icon: '💫', title: 'Synastry Compatibility', body: 'Deep compatibility reports comparing two full birth charts with aspect-by-aspect analysis.' },
  { icon: '🪐', title: 'Planetary Return Reports', body: 'Solar returns, lunar returns, and major planetary cycle readings for life planning.' },
  { icon: '📅', title: 'Extended Forecasting', body: 'Weekly and monthly personal forecasts based on your transiting planets.' },
  { icon: '🤖', title: 'Unlimited AI Chat', body: 'Unrestricted cosmic conversations with your AI oracle for as long as you like.' },
];

function FeatureRow({ icon, title, body }) {
  return h(Section, {
    style: {
      background: C.cardGold,
      borderRadius: '8px',
      padding: '14px 18px',
      marginBottom: '10px',
      borderLeft: `3px solid ${C.gold}`,
    },
  },
    h(Text, { style: { fontSize: '14px', fontWeight: 'bold', color: C.goldLight, margin: '0 0 3px' } },
      `${icon} ${title}`
    ),
    h(Text, { style: { fontSize: '13px', color: C.textSecondary, margin: '0', lineHeight: '1.5' } }, body)
  );
}

function PremiumWelcomeEmail({ displayName = 'Cosmic Seeker', hasBirthChart = false }) {
  const ctaHref = hasBirthChart
    ? 'https://astrooracle.space/chart'
    : 'https://astrooracle.space/onboarding';
  const ctaLabel = hasBirthChart
    ? 'View Your Birth Chart →'
    : 'Set Up Your Birth Chart →';

  return h(Html, { lang: 'en' },
    h(Head, null),
    h(Preview, null, 'Your full cosmic access is unlocked — explore every premium feature'),
    h(Body, { style: { backgroundColor: C.bg, margin: '0', padding: '0', fontFamily: 'Georgia, serif' } },
      h(Container, { style: { maxWidth: '600px', margin: '0 auto', padding: '0 24px 40px' } },

        // Logo bar
        h(Section, { style: { padding: '32px 0 0', textAlign: 'center' } },
          h(Text, { style: { fontSize: '22px', fontWeight: 'bold', color: C.goldLight, margin: '0', letterSpacing: '2px' } },
            '✦ AstroOracle'
          ),
          h(Text, { style: { fontSize: '11px', color: C.textMuted, margin: '4px 0 0', letterSpacing: '3px', textTransform: 'uppercase' } },
            'Premium Member'
          )
        ),

        // Hero
        h(Section, {
          style: {
            background: 'linear-gradient(135deg, #1a0f00 0%, #2d1a00 40%, #1a0f00 100%)',
            borderRadius: '12px',
            padding: '48px 32px',
            textAlign: 'center',
            border: `1px solid ${C.goldBorder}`,
            marginTop: '24px',
          },
        },
          h(Text, { style: { fontSize: '48px', margin: '0 0 12px', lineHeight: '1' } }, '⭐'),
          h(Text, { style: { fontSize: '26px', fontWeight: 'bold', color: C.goldLight, margin: '0 0 8px' } },
            `Congratulations, ${displayName}!`
          ),
          h(Text, { style: { fontSize: '15px', color: '#c8aa60', margin: '0' } },
            'You now have full access to the cosmos'
          )
        ),

        // Intro
        h(Section, { style: { padding: '28px 0 8px' } },
          h(Text, { style: { fontSize: '15px', color: C.textPrimary, lineHeight: '1.7', margin: '0' } },
            'Welcome to AstroOracle Premium. Every cosmic tool is now unlocked and waiting for you. Here is everything you can access starting right now:'
          )
        ),

        // Premium features
        h(Section, { style: { paddingTop: '16px' } },
          h(Text, { style: { fontSize: '13px', fontWeight: 'bold', color: C.gold, margin: '0 0 14px', letterSpacing: '1px', textTransform: 'uppercase' } },
            'Your Premium Features'
          ),
          ...PREMIUM_FEATURES.map(f => h(FeatureRow, { key: f.title, ...f }))
        ),

        // CTA
        h(Section, { style: { textAlign: 'center', padding: '32px 0' } },
          h(Text, { style: { fontSize: '14px', color: C.textSecondary, margin: '0 0 16px' } },
            hasBirthChart
              ? 'Your birth chart is ready — dive into your personal cosmic blueprint'
              : 'Start by entering your birth details to unlock personalized insights'
          ),
          h(Button, {
            href: ctaHref,
            style: {
              backgroundColor: C.gold,
              color: '#000000',
              padding: '14px 36px',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: 'bold',
              textDecoration: 'none',
            },
          }, ctaLabel)
        ),

        // How to access
        h(Section, {
          style: {
            background: C.card,
            borderRadius: '8px',
            padding: '20px 24px',
            border: `1px solid ${C.border}`,
            marginBottom: '32px',
          },
        },
          h(Text, { style: { fontSize: '13px', fontWeight: 'bold', color: C.textPrimary, margin: '0 0 10px' } },
            'How to access each feature:'
          ),
          h(Text, { style: { fontSize: '13px', color: C.textSecondary, margin: '0', lineHeight: '1.8' } },
            '📊 Birth Chart → Menu → My Chart\n' +
            '🌙 Daily Horoscope → Home → Today\'s Reading\n' +
            '💫 Compatibility → Menu → Synastry\n' +
            '🤖 AI Chat → The chat icon in the bottom bar\n' +
            '🪐 Forecasts → Menu → My Transits'
          )
        ),

        h(Hr, { style: { border: 'none', borderTop: `1px solid ${C.border}`, margin: '0' } }),

        // Footer
        h(Section, { style: { padding: '24px 0', textAlign: 'center' } },
          h(Text, { style: { fontSize: '12px', color: C.textMuted, margin: '0 0 6px' } },
            '✦ AstroOracle — Cosmic Knowledge AI'
          ),
          h(Text, { style: { fontSize: '12px', color: C.textMuted, margin: '0' } },
            'Manage your subscription at ',
            h(Link, { href: 'https://astrooracle.space/settings', style: { color: C.textMuted, textDecoration: 'underline' } }, 'astrooracle.space/settings'),
            '. ',
            h(Link, { href: 'https://astrooracle.space/settings#notifications', style: { color: C.textMuted, textDecoration: 'underline' } }, 'Unsubscribe')
          )
        )
      )
    )
  );
}

export async function renderPremiumWelcomeEmail(props = {}) {
  return render(h(PremiumWelcomeEmail, props));
}

export const premiumWelcomeEmailSubject = () =>
  '⭐ Your AstroOracle Premium Access Is Now Active';
