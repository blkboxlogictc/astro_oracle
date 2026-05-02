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
  gold: '#d4a017',
  textPrimary: '#e8e0ff',
  textSecondary: '#9b8ec4',
  textMuted: '#5c5480',
  border: '#1e1b4b',
};

function FeatureCard({ icon, title, body }) {
  return h(Section, {
    style: {
      background: C.card,
      borderRadius: '8px',
      padding: '16px 20px',
      marginBottom: '12px',
      borderLeft: `3px solid ${C.purple}`,
    },
  },
    h(Text, { style: { fontSize: '15px', fontWeight: 'bold', color: C.purpleLight, margin: '0 0 4px' } },
      `${icon} ${title}`
    ),
    h(Text, { style: { fontSize: '13px', color: C.textSecondary, margin: '0', lineHeight: '1.5' } }, body)
  );
}

function WelcomeEmail({ displayName = 'Cosmic Seeker' }) {
  return h(Html, { lang: 'en' },
    h(Head, null),
    h(Preview, null, 'Your cosmic journey begins — complete your profile to unlock the stars'),
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
            background: 'linear-gradient(135deg, #1a0533 0%, #0d1b4a 50%, #1a0533 100%)',
            borderRadius: '12px',
            padding: '48px 32px',
            textAlign: 'center',
            border: `1px solid ${C.border}`,
            marginTop: '24px',
          },
        },
          h(Text, { style: { fontSize: '48px', margin: '0 0 12px', lineHeight: '1' } }, '✨'),
          h(Text, { style: { fontSize: '26px', fontWeight: 'bold', color: C.textPrimary, margin: '0 0 8px' } },
            `Welcome, ${displayName}`
          ),
          h(Text, { style: { fontSize: '15px', color: C.textSecondary, margin: '0' } },
            'Your cosmic journey begins now'
          )
        ),

        // Intro
        h(Section, { style: { padding: '28px 0 8px' } },
          h(Text, { style: { fontSize: '15px', color: C.textPrimary, lineHeight: '1.7', margin: '0' } },
            'AstroOracle is your AI-powered guide to the cosmos — combining real-time astronomical data with ancient astrological wisdom to give you daily guidance, birth chart insights, and answers to your deepest cosmic questions.'
          )
        ),

        // Features
        h(Section, { style: { paddingTop: '20px' } },
          h(Text, { style: { fontSize: '13px', fontWeight: 'bold', color: C.gold, margin: '0 0 14px', letterSpacing: '1px', textTransform: 'uppercase' } },
            "What's waiting for you"
          ),
          h(FeatureCard, {
            icon: '💬',
            title: 'AI Cosmic Chat',
            body: 'Ask anything about astrology, your chart, cosmic events, and more. Your AI oracle is available 24/7.',
          }),
          h(FeatureCard, {
            icon: '🌙',
            title: 'Your Sky Tonight',
            body: 'See live planetary positions, upcoming cosmic events, and what they mean for you right now.',
          }),
          h(FeatureCard, {
            icon: '⭐',
            title: 'Daily Horoscope',
            body: 'Start each day with a personalized horoscope covering love, career, wellness, and your cosmic advice.',
          })
        ),

        // CTA
        h(Section, { style: { textAlign: 'center', padding: '32px 0' } },
          h(Text, { style: { fontSize: '14px', color: C.textSecondary, margin: '0 0 16px' } },
            'Add your birth details to unlock personalized insights'
          ),
          h(Button, {
            href: 'https://astrooracle.space/onboarding',
            style: {
              backgroundColor: C.purple,
              color: '#ffffff',
              padding: '14px 36px',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: 'bold',
              textDecoration: 'none',
            },
          }, 'Complete Your Cosmic Profile →')
        ),

        h(Hr, { style: { border: 'none', borderTop: `1px solid ${C.border}`, margin: '0' } }),

        // Footer
        h(Section, { style: { padding: '24px 0', textAlign: 'center' } },
          h(Text, { style: { fontSize: '12px', color: C.textMuted, margin: '0 0 6px' } },
            '✦ AstroOracle — Cosmic Knowledge AI'
          ),
          h(Text, { style: { fontSize: '12px', color: C.textMuted, margin: '0' } },
            'You received this because you created an AstroOracle account. ',
            h(Link, {
              href: 'https://astrooracle.space/settings#notifications',
              style: { color: C.textMuted, textDecoration: 'underline' },
            }, 'Unsubscribe')
          )
        )
      )
    )
  );
}

export async function renderWelcomeEmail(props = {}) {
  return render(h(WelcomeEmail, props));
}

export const welcomeEmailSubject = (displayName) =>
  `✨ Welcome to AstroOracle, ${displayName}`;
