import { createElement as h } from 'react';
import { render } from '@react-email/render';
import {
  Html, Head, Body, Preview, Container,
  Section, Text, Button, Hr, Link,
} from '@react-email/components';

const C = {
  bg: '#080816',
  card: '#0d0b28',
  amber: '#d97706',
  amberLight: '#fbbf24',
  amberBorder: '#3d2200',
  amberCard: '#150c00',
  purple: '#7c3aed',
  purpleLight: '#9f67fa',
  textPrimary: '#e8e0ff',
  textSecondary: '#9b8ec4',
  textMuted: '#5c5480',
  border: '#1e1b4b',
};

function PaymentFailedEmail({
  displayName = 'Cosmic Seeker',
  last4 = '****',
  portalUrl = 'https://astrooracle.space/settings',
}) {
  return h(Html, { lang: 'en' },
    h(Head, null),
    h(Preview, null, 'Action needed: Update your payment method to keep your cosmic access'),
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

        // Hero (warm amber tone for urgency)
        h(Section, {
          style: {
            background: 'linear-gradient(135deg, #1a0c00 0%, #2d1500 50%, #1a0c00 100%)',
            borderRadius: '12px',
            padding: '44px 32px',
            textAlign: 'center',
            border: `1px solid ${C.amberBorder}`,
            marginTop: '24px',
          },
        },
          h(Text, { style: { fontSize: '42px', margin: '0 0 12px', lineHeight: '1' } }, '⚠️'),
          h(Text, { style: { fontSize: '24px', fontWeight: 'bold', color: C.amberLight, margin: '0 0 8px' } },
            'Payment failed'
          ),
          h(Text, { style: { fontSize: '14px', color: '#c8933a', margin: '0' } },
            'Action required to keep your premium access'
          )
        ),

        // Details
        h(Section, { style: { padding: '28px 0 8px' } },
          h(Text, { style: { fontSize: '15px', color: C.textPrimary, lineHeight: '1.7', margin: '0 0 16px' } },
            `Hi ${displayName}, we were unable to process your AstroOracle Premium payment. This can happen when a card expires, has insufficient funds, or a bank blocks the charge.`
          )
        ),

        // Payment info card
        h(Section, {
          style: {
            background: C.amberCard,
            borderRadius: '8px',
            padding: '20px 24px',
            border: `1px solid ${C.amberBorder}`,
            margin: '0 0 24px',
          },
        },
          h(Text, { style: { fontSize: '13px', color: '#c8933a', margin: '0 0 12px', fontWeight: 'bold' } },
            'Payment details:'
          ),
          h(Text, { style: { fontSize: '14px', color: C.textSecondary, margin: '0 0 6px' } },
            `Card on file: •••• •••• •••• ${last4}`
          ),
          h(Text, { style: { fontSize: '14px', color: C.textSecondary, margin: '0' } },
            'Status: Payment declined'
          )
        ),

        // Grace period
        h(Section, {
          style: {
            background: C.card,
            borderRadius: '8px',
            padding: '16px 20px',
            border: `1px solid ${C.border}`,
            marginBottom: '28px',
          },
        },
          h(Text, { style: { fontSize: '13px', color: C.textSecondary, margin: '0', lineHeight: '1.6' } },
            '⏱ You have a 7-day grace period — your premium access continues while you update your payment method. After that, your account will move to the free plan.'
          )
        ),

        // CTA
        h(Section, { style: { textAlign: 'center', padding: '8px 0 32px' } },
          h(Text, { style: { fontSize: '14px', color: C.textSecondary, margin: '0 0 16px' } },
            'Update your card now to avoid any interruption'
          ),
          h(Button, {
            href: portalUrl,
            style: {
              backgroundColor: C.amber,
              color: '#000000',
              padding: '14px 36px',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: 'bold',
              textDecoration: 'none',
            },
          }, 'Update Payment Method →')
        ),

        h(Section, { style: { textAlign: 'center', marginBottom: '32px' } },
          h(Text, { style: { fontSize: '13px', color: C.textMuted, margin: '0' } },
            'Or visit ',
            h(Link, { href: 'https://astrooracle.space/settings', style: { color: C.textMuted, textDecoration: 'underline' } },
              'your account settings'
            ),
            ' to manage billing.'
          )
        ),

        h(Hr, { style: { border: 'none', borderTop: `1px solid ${C.border}`, margin: '0' } }),

        // Footer
        h(Section, { style: { padding: '24px 0', textAlign: 'center' } },
          h(Text, { style: { fontSize: '12px', color: C.textMuted, margin: '0 0 6px' } },
            '✦ AstroOracle — Cosmic Knowledge AI'
          ),
          h(Text, { style: { fontSize: '12px', color: C.textMuted, margin: '0' } },
            'This is a billing notification for your AstroOracle account. ',
            h(Link, { href: 'https://astrooracle.space/settings#notifications', style: { color: C.textMuted, textDecoration: 'underline' } }, 'Unsubscribe')
          )
        )
      )
    )
  );
}

export async function renderPaymentFailedEmail(props = {}) {
  return render(h(PaymentFailedEmail, props));
}

export const paymentFailedEmailSubject = () =>
  '⚠️ Action needed: Payment failed for AstroOracle Premium';
