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
};

// Theme per event type
const EVENT_THEMES = {
  full_moon:         { gradient: 'linear-gradient(135deg, #0a0f1a 0%, #1a2040 50%, #0a0f1a 100%)', accent: '#c0d0ff', border: '#1a2a50', icon: '🌕', label: 'Full Moon' },
  new_moon:          { gradient: 'linear-gradient(135deg, #080816 0%, #10103a 50%, #080816 100%)', accent: '#7a8ec4', border: '#1e1b4b', icon: '🌑', label: 'New Moon' },
  retrograde_start:  { gradient: 'linear-gradient(135deg, #1a0c00 0%, #2d1500 50%, #1a0c00 100%)', accent: '#fbbf24', border: '#3d2200', icon: '℞', label: 'Retrograde' },
  retrograde_end:    { gradient: 'linear-gradient(135deg, #001a0a 0%, #002d15 50%, #001a0a 100%)', accent: '#4ade80', border: '#003020', icon: '↻', label: 'Direct Station' },
  eclipse:           { gradient: 'linear-gradient(135deg, #0a0010 0%, #1a003a 50%, #0a0010 100%)', accent: '#c084fc', border: '#2d004a', icon: '🌒', label: 'Eclipse' },
  meteor_shower:     { gradient: 'linear-gradient(135deg, #080012 0%, #0d0525 50%, #080012 100%)', accent: '#e0c0ff', border: '#200050', icon: '☄️', label: 'Meteor Shower' },
};

const DEFAULT_THEME = { gradient: 'linear-gradient(135deg, #0d0b28 0%, #1a1040 50%, #0d0b28 100%)', accent: '#9f67fa', border: '#1e1b4b', icon: '✨', label: 'Cosmic Event' };

function CosmicEventEmail({ displayName = 'Cosmic Seeker', event = {} }) {
  const theme = EVENT_THEMES[event.type] ?? DEFAULT_THEME;
  const eventName = event.description ?? event.event_name ?? theme.label;
  const dateStr = event.event_date
    ? new Date(event.event_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    : 'soon';

  return h(Html, { lang: 'en' },
    h(Head, null),
    h(Preview, null, `${eventName} arrives ${dateStr} — see how it affects you`),
    h(Body, { style: { backgroundColor: C.bg, margin: '0', padding: '0', fontFamily: 'Georgia, serif' } },
      h(Container, { style: { maxWidth: '600px', margin: '0 auto', padding: '0 24px 40px' } },

        // Logo bar
        h(Section, { style: { padding: '32px 0 0', textAlign: 'center' } },
          h(Text, { style: { fontSize: '22px', fontWeight: 'bold', color: C.purpleLight, margin: '0', letterSpacing: '2px' } },
            '✦ AstroOracle'
          ),
          h(Text, { style: { fontSize: '11px', color: C.textMuted, margin: '4px 0 0', letterSpacing: '3px', textTransform: 'uppercase' } },
            'Cosmic Alert'
          )
        ),

        // Dynamic hero
        h(Section, {
          style: {
            background: theme.gradient,
            borderRadius: '12px',
            padding: '48px 32px',
            textAlign: 'center',
            border: `1px solid ${theme.border}`,
            marginTop: '24px',
          },
        },
          h(Text, { style: { fontSize: '48px', margin: '0 0 12px', lineHeight: '1' } }, theme.icon),
          h(Text, { style: { fontSize: '13px', color: theme.accent, margin: '0 0 8px', letterSpacing: '2px', textTransform: 'uppercase' } },
            theme.label
          ),
          h(Text, { style: { fontSize: '24px', fontWeight: 'bold', color: C.textPrimary, margin: '0 0 8px' } },
            eventName
          ),
          h(Text, { style: { fontSize: '14px', color: theme.accent, margin: '0' } }, dateStr)
        ),

        // Intro
        h(Section, { style: { padding: '28px 0 8px' } },
          h(Text, { style: { fontSize: '15px', color: C.textPrimary, lineHeight: '1.7', margin: '0 0 16px' } },
            `Hi ${displayName}, a significant celestial event is approaching. Here is what is happening and what it means for you.`
          )
        ),

        // What's happening
        h(Section, {
          style: {
            background: C.card,
            borderRadius: '8px',
            padding: '20px 24px',
            border: `1px solid ${C.border}`,
            marginBottom: '16px',
          },
        },
          h(Text, { style: { fontSize: '13px', fontWeight: 'bold', color: theme.accent, margin: '0 0 10px', letterSpacing: '1px', textTransform: 'uppercase' } },
            'What is happening'
          ),
          h(Text, { style: { fontSize: '14px', color: C.textSecondary, margin: '0', lineHeight: '1.7' } },
            event.scientific_description ?? getDefaultDescription(event.type, eventName)
          )
        ),

        // Personalized impact (if available, or generic message)
        h(Section, {
          style: {
            background: C.card,
            borderRadius: '8px',
            padding: '20px 24px',
            border: `1px solid ${theme.border}`,
            marginBottom: '28px',
          },
        },
          h(Text, { style: { fontSize: '13px', fontWeight: 'bold', color: C.purpleLight, margin: '0 0 10px', letterSpacing: '1px', textTransform: 'uppercase' } },
            'Your Cosmic Insight'
          ),
          h(Text, { style: { fontSize: '14px', color: C.textSecondary, margin: '0', lineHeight: '1.7' } },
            event.personal_impact ??
            'Open AstroOracle to see exactly how this event interacts with your birth chart and what it means for your personal journey.'
          )
        ),

        // Visibility (if provided)
        event.visibility && h(Section, {
          style: {
            background: '#08100a',
            borderRadius: '8px',
            padding: '14px 18px',
            border: '1px solid #003020',
            marginBottom: '28px',
          },
        },
          h(Text, { style: { fontSize: '13px', color: '#4ade80', margin: '0', lineHeight: '1.6' } },
            `🔭 Visibility: ${event.visibility}`
          )
        ),

        // CTA
        h(Section, { style: { textAlign: 'center', padding: '0 0 32px' } },
          h(Button, {
            href: 'https://astrooracle.space/chat',
            style: {
              backgroundColor: C.purple,
              color: '#ffffff',
              padding: '13px 32px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 'bold',
              textDecoration: 'none',
            },
          }, `Ask AstroOracle About This →`)
        ),

        h(Hr, { style: { border: 'none', borderTop: `1px solid ${C.border}`, margin: '0' } }),

        // Footer
        h(Section, { style: { padding: '24px 0', textAlign: 'center' } },
          h(Text, { style: { fontSize: '12px', color: C.textMuted, margin: '0 0 6px' } },
            '✦ AstroOracle — Cosmic Knowledge AI'
          ),
          h(Text, { style: { fontSize: '12px', color: C.textMuted, margin: '0' } },
            'You\'re receiving cosmic event alerts based on your notification preferences. ',
            h(Link, { href: 'https://astrooracle.space/settings#notifications', style: { color: C.textMuted, textDecoration: 'underline' } }, 'Manage preferences'),
            ' · ',
            h(Link, { href: 'https://astrooracle.space/settings#notifications', style: { color: C.textMuted, textDecoration: 'underline' } }, 'Unsubscribe')
          )
        )
      )
    )
  );
}

function getDefaultDescription(eventType, eventName) {
  const descriptions = {
    full_moon: 'The Moon reaches its fullest illumination, completing a lunar cycle and illuminating patterns that have been building over the past two weeks.',
    new_moon: 'The Moon and Sun align in the same sign, beginning a new 28-day lunar cycle — a powerful time for setting intentions and starting fresh.',
    retrograde_start: `${eventName} — a planet appears to move backward from Earth's perspective due to orbital mechanics. This period often brings review, revision, and reconnection themes.`,
    retrograde_end: `${eventName} — the planet resumes direct motion after its retrograde phase. The lessons of the retrograde period now integrate into forward momentum.`,
    eclipse: 'An eclipse amplifies the energy of a lunation many times over, often marking significant turning points and revelations that unfold over the following six months.',
    meteor_shower: 'Earth passes through a trail of debris left by a comet or asteroid, creating streaks of light as particles burn up in the atmosphere.',
  };
  return descriptions[eventType] ?? `${eventName} is a notable celestial occurrence that carries meaningful astrological significance.`;
}

export async function renderCosmicEventEmail(props = {}) {
  return render(h(CosmicEventEmail, props));
}

export const cosmicEventEmailSubject = (eventName, dateStr) =>
  `✨ ${eventName} — ${dateStr}`;
