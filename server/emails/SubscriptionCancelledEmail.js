import { createElement as h } from 'react';
import { render } from '@react-email/render';
import {
  Html, Head, Body, Preview, Container,
  Section, Text, Button, Hr, Link,
} from '@react-email/components';

const C = {
  bg: '#080816',
  card: '#0d0b28',
  purple: '#7c3aed',
  purpleLight: '#9f67fa',
  textPrimary: '#e8e0ff',
  textSecondary: '#9b8ec4',
  textMuted: '#5c5480',
  border: '#1e1b4b',
  subdued: '#1a1635',
  subduedBorder: '#2a2550',
};

const LOST_FEATURES = [
  'Personalized daily horoscopes based on your birth chart',
  'Full natal birth chart with house placements',
  'Synastry compatibility reports',
  'Unlimited AI cosmic chat',
  'Personal planetary transit forecasts',
];

function SubscriptionCancelledEmail({ displayName = 'Cosmic Seeker', periodEnd = 'the end of your billing period' }) {
  return h(Html, { lang: 'en' },
    h(Head, null),
    h(Preview, null, 'Your AstroOracle Premium has ended — your data is safe and waiting'),
    h(Body, { style: { backgroundColor: C.bg, margin: '0', padding: '0', fontFamily: 'Georgia, serif' } },
      h(Container, { style: { maxWidth: '600px', margin: '0 auto', padding: '0 24px 40px' } },

        // Logo bar
        h(Section, { style: { padding: '32px 0 0', textAlign: 'center' } },
          h(Text, { style: { fontSize: '22px', fontWeight: 'bold', color: C.purpleLight, margin: '0', letterSpacing: '2px' } },
            '✦ AstroOracle'
          ),
          h(Text, { style: { fontSize: '11px', color: C.textMuted, margin: '4px 0 0', letterSpacing: '3px', textTransform: 'uppercase' } },
            'Cosmic Knowledge AI'
          )
        ),

        // Hero
        h(Section, {
          style: {
            background: 'linear-gradient(135deg, #0f0d2a 0%, #12103a 50%, #0f0d2a 100%)',
            borderRadius: '12px',
            padding: '48px 32px',
            textAlign: 'center',
            border: `1px solid ${C.subduedBorder}`,
            marginTop: '24px',
          },
        },
          h(Text, { style: { fontSize: '42px', margin: '0 0 12px', lineHeight: '1' } }, '🌌'),
          h(Text, { style: { fontSize: '24px', fontWeight: 'bold', color: C.textPrimary, margin: '0 0 8px' } },
            'Your subscription has ended'
          ),
          h(Text, { style: { fontSize: '14px', color: C.textSecondary, margin: '0' } },
            `Premium access ended on ${periodEnd}`
          )
        ),

        // Confirmation
        h(Section, { style: { padding: '28px 0 8px' } },
          h(Text, { style: { fontSize: '15px', color: C.textPrimary, lineHeight: '1.7', margin: '0 0 12px' } },
            `Hi ${displayName}, we've confirmed the cancellation of your AstroOracle Premium subscription. We hope the stars brought you clarity during your time with us.`
          ),
          h(Text, { style: { fontSize: '15px', color: C.textPrimary, lineHeight: '1.7', margin: '0' } },
            'Your account remains active on the free plan — you can still access AI chat, tonight\'s sky, and your general daily horoscope.'
          )
        ),

        // What you lose
        h(Section, {
          style: {
            background: C.subdued,
            borderRadius: '8px',
            padding: '20px 24px',
            border: `1px solid ${C.subduedBorder}`,
            margin: '20px 0 28px',
          },
        },
          h(Text, { style: { fontSize: '13px', fontWeight: 'bold', color: C.textSecondary, margin: '0 0 12px', letterSpacing: '1px', textTransform: 'uppercase' } },
            'Premium features no longer available:'
          ),
          ...LOST_FEATURES.map((f, i) =>
            h(Text, {
              key: i,
              style: { fontSize: '13px', color: C.textMuted, margin: '0 0 6px', paddingLeft: '4px' },
            }, `· ${f}`)
          )
        ),

        // Saved data note
        h(Section, {
          style: {
            background: C.card,
            borderRadius: '8px',
            padding: '16px 20px',
            border: `1px solid ${C.border}`,
            marginBottom: '32px',
          },
        },
          h(Text, { style: { fontSize: '13px', color: C.textSecondary, margin: '0', lineHeight: '1.6' } },
            '🔒 Your birth chart, saved conversations, and all cosmic data are safely preserved. If you return, everything will be exactly as you left it.'
          )
        ),

        // CTA
        h(Section, { style: { textAlign: 'center', padding: '8px 0 32px' } },
          h(Text, { style: { fontSize: '14px', color: C.textSecondary, margin: '0 0 16px' } },
            'Changed your mind? Reactivate anytime — no setup needed.'
          ),
          h(Button, {
            href: 'https://astrooracle.space/upgrade',
            style: {
              backgroundColor: C.purple,
              color: '#ffffff',
              padding: '14px 36px',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: 'bold',
              textDecoration: 'none',
            },
          }, 'Reactivate Premium')
        ),

        h(Hr, { style: { border: 'none', borderTop: `1px solid ${C.border}`, margin: '0' } }),

        // Footer
        h(Section, { style: { padding: '24px 0', textAlign: 'center' } },
          h(Text, { style: { fontSize: '12px', color: C.textMuted, margin: '0 0 6px' } },
            '✦ AstroOracle — Cosmic Knowledge AI'
          ),
          h(Text, { style: { fontSize: '12px', color: C.textMuted, margin: '0' } },
            'Questions? Visit ',
            h(Link, { href: 'https://astrooracle.space/settings', style: { color: C.textMuted, textDecoration: 'underline' } }, 'your account settings'),
            '. ',
            h(Link, { href: 'https://astrooracle.space/settings#notifications', style: { color: C.textMuted, textDecoration: 'underline' } }, 'Unsubscribe')
          )
        )
      )
    )
  );
}

export async function renderSubscriptionCancelledEmail(props = {}) {
  return render(h(SubscriptionCancelledEmail, props));
}

export const subscriptionCancelledEmailSubject = () =>
  'Your AstroOracle Premium subscription has ended';
