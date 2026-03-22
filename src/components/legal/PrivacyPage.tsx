import { useTranslation } from 'react-i18next'
import { ArrowLeft } from 'lucide-react'

interface Props {
  onBack: () => void
}

export function PrivacyPage({ onBack }: Props) {
  const { t } = useTranslation()

  return (
    <div className="h-full overflow-y-auto bg-[var(--color-bg-primary)]">
      <div className="min-h-full px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] mb-6 cursor-pointer transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('legal.back')}
        </button>

        <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-6 tracking-[-0.02em]">
          {t('legal.privacyTitle')}
        </h1>

        <div className="prose prose-sm text-[var(--color-text-secondary)] space-y-4 text-sm leading-relaxed">
          <p><strong>Last updated:</strong> March 2026</p>

          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mt-6">1. Data We Collect</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Account data:</strong> Username, email (optional), display name, avatar.</li>
            <li><strong>Messages:</strong> Text content, file attachments, metadata sent through conversations.</li>
            <li><strong>Usage data:</strong> Login timestamps, device information for session management.</li>
          </ul>

          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mt-6">2. Local Storage</h2>
          <p>This application uses browser session storage and IndexedDB for:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Authentication tokens (session storage — cleared when tab closes)</li>
            <li>Message drafts and offline queue (IndexedDB)</li>
            <li>Theme and language preferences (local storage)</li>
          </ul>

          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mt-6">3. How We Use Data</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>To provide the messaging service and deliver messages to intended recipients.</li>
            <li>To authenticate users and manage sessions.</li>
            <li>To enable offline functionality and message synchronization.</li>
          </ul>

          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mt-6">4. Data Sharing</h2>
          <p>We do not sell or share your personal data with third parties. Messages are delivered only to conversation participants.</p>

          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mt-6">5. Data Retention</h2>
          <p>Messages and account data are retained for the duration of your account. Deleted messages are soft-deleted and may be purged periodically.</p>

          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mt-6">6. Security</h2>
          <p>We use bcrypt password hashing, JWT authentication, rate limiting, and HTTPS encryption to protect your data. API keys are hashed with SHA-256.</p>

          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mt-6">7. Your Rights</h2>
          <p>You may request access to, correction of, or deletion of your personal data by contacting your administrator.</p>

          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mt-6">8. Contact</h2>
          <p>For privacy inquiries, contact the service administrator.</p>
        </div>
      </div>
      </div>
    </div>
  )
}
