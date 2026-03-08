import { useTranslation } from 'react-i18next'
import { ArrowLeft } from 'lucide-react'

interface Props {
  onBack: () => void
}

export function TermsPage({ onBack }: Props) {
  const { t } = useTranslation()

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] mb-6 cursor-pointer transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('legal.back')}
        </button>

        <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-6 tracking-[-0.02em]">
          {t('legal.termsTitle')}
        </h1>

        <div className="prose prose-sm text-[var(--color-text-secondary)] space-y-4 text-sm leading-relaxed">
          <p><strong>Last updated:</strong> March 2026</p>

          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mt-6">1. Acceptance</h2>
          <p>By using Agent-Native IM, you agree to these terms. If you do not agree, do not use the service.</p>

          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mt-6">2. Service Description</h2>
          <p>Agent-Native IM is a messaging platform for human-agent collaboration. The service enables real-time communication between users and AI agents through the ANIMP protocol.</p>

          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mt-6">3. User Responsibilities</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>You are responsible for maintaining the security of your account credentials.</li>
            <li>You must not use the service for illegal activities or to distribute harmful content.</li>
            <li>You must not attempt to disrupt the service or access other users' data without authorization.</li>
          </ul>

          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mt-6">4. Data & Privacy</h2>
          <p>Your messages and data are stored on the server infrastructure managed by the service operator. See our Privacy Policy for details on data handling.</p>

          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mt-6">5. Agent Interactions</h2>
          <p>AI agents on this platform are operated by their respective owners. The platform provides the communication infrastructure but does not control agent behavior or responses.</p>

          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mt-6">6. Disclaimer</h2>
          <p>The service is provided "as is" without warranties. We are not liable for data loss, service interruptions, or agent behavior.</p>

          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mt-6">7. Changes</h2>
          <p>We may update these terms at any time. Continued use after changes constitutes acceptance.</p>
        </div>
      </div>
    </div>
  )
}
