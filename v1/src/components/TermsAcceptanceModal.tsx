/* Wave3-sep */
/* Wave2: type=button applied */
import { useState } from "react";

interface TermsAcceptanceModalProps {
  onAccept: () => void;
}

export default function TermsAcceptanceModal({ onAccept }: TermsAcceptanceModalProps) {
  const [scrolledTerms, setScrolledTerms] = useState(false);
  const [scrolledPrivacy, setScrolledPrivacy] = useState(false);
  const [checkedTerms, setCheckedTerms] = useState(false);
  const [checkedPrivacy, setCheckedPrivacy] = useState(false);
  const [activeTab, setActiveTab] = useState<"terms" | "privacy">("terms");

  const canAccept = checkedTerms && checkedPrivacy;

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    if (atBottom) {
      if (activeTab === "terms") setScrolledTerms(true);
      if (activeTab === "privacy") setScrolledPrivacy(true);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-studio-bg overflow-hidden items-center justify-center">
      <div className="w-full max-w-2xl bg-studio-panel border border-studio-border rounded-xl shadow-2xl shadow-black/50 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-studio-border">
          <span className="text-3xl">{"\u{1F480}\u{1F3A8}"}</span>
          <div>
            {/* Improvement 524: Screen Reader Accessibility */}
            <h1 role="heading" aria-level={1} className="text-lg font-bold text-studio-text">Welcome to CryptArtist Studio</h1>
            <p className="text-xs text-studio-muted">Please review and accept our Terms of Use and Privacy Policy to continue.</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-studio-border px-4">
          <button type="button"
            onClick={() => setActiveTab("terms")}
            className={`px-4 py-2.5 text-[11px] font-semibold transition-colors border-b-2 -mb-px ${
              activeTab === "terms"
                ? "border-studio-cyan text-studio-cyan"
                : "border-transparent text-studio-muted hover:text-studio-text"
            }`}
          >
            {"\u{1F4DC}"} Terms of Use {scrolledTerms && "\u2705"}
          </button>
          <button type="button"
            onClick={() => setActiveTab("privacy")}
            className={`px-4 py-2.5 text-[11px] font-semibold transition-colors border-b-2 -mb-px ${
              activeTab === "privacy"
                ? "border-studio-cyan text-studio-cyan"
                : "border-transparent text-studio-muted hover:text-studio-text"
            }`}
          >
            {"\u{1F512}"} Privacy Policy {scrolledPrivacy && "\u2705"}
          </button>
        </div>

        {/* Scrollable Content */}
        <div
          className="flex-1 overflow-y-auto p-6 min-h-0"
          style={{ maxHeight: "50vh" }}
          onScroll={handleScroll}
        >
          {activeTab === "terms" && (
            <div className="text-sm text-studio-text leading-relaxed animate-fade-in">
            {/* Improvement 525: Screen Reader Accessibility */}
              <h2 role="heading" aria-level={2} className="text-base font-bold mb-3">Terms of Use</h2>
              <p className="text-xs text-studio-muted mb-4">Last updated: March 13, 2026 - Version 1.69.420.3</p>

              <p className="mb-3">
                These Terms of Use ("Terms") govern your use of the CryptArtist Studio desktop
                application and related websites (mattyjacks.com, givegigs.com) (collectively,
                the "Service"), operated by <strong>MattyJacks</strong>, a sole proprietorship in
                New Hampshire, United States. By installing, accessing, or using the Service, you
                agree to be bound by these Terms.
              </p>

            {/* Improvement 526: Screen Reader Accessibility */}
              <h3 role="heading" aria-level={3} className="font-bold mt-4 mb-2">1. Acceptance of Terms</h3>
              <p className="mb-3">
                By using CryptArtist Studio, you affirm that you are at least 13 years of age and
                are legally capable of entering into a binding agreement. If under 18, your parent
                or guardian must agree on your behalf.
              </p>

            {/* Improvement 527: Screen Reader Accessibility */}
              <h3 role="heading" aria-level={3} className="font-bold mt-4 mb-2">2. Sole Proprietorship</h3>
              <p className="mb-3">
                CryptArtist Studio is operated by MattyJacks, a sole proprietorship based in
                New Hampshire, USA. All references to "we," "us," or "our" refer to MattyJacks.
              </p>

            {/* Improvement 528: Screen Reader Accessibility */}
              <h3 role="heading" aria-level={3} className="font-bold mt-4 mb-2">3. Third-Party Services</h3>
              <p className="mb-3">
                The Service connects to: OpenAI API, OpenRouter, ElevenLabs, Pexels API,
                Supabase/GiveGigs, Vercel, Cloudflare, and Google Analytics. Your use of these
                is subject to their respective terms. Any third-party API fees are your responsibility.
              </p>

            {/* Improvement 529: Screen Reader Accessibility */}
              <h3 role="heading" aria-level={3} className="font-bold mt-4 mb-2">4. AI-Generated Content</h3>
              <p className="mb-3">
                AI-generated content may be inaccurate, incomplete, or inappropriate. You are solely
                responsible for reviewing and verifying all AI output. The Operator is not liable
                for any damages from AI-generated content, including code, images, audio, or games.
              </p>

            {/* Improvement 530: Screen Reader Accessibility */}
              <h3 role="heading" aria-level={3} className="font-bold mt-4 mb-2">5. Video Game Cloner</h3>
              <p className="mb-3">
                The Video Game Cloner generates original games based on public domain mechanics.
                <strong> You are solely responsible for games you produce.</strong> The Operator is not
                liable for any IP claims and will actively report copyright infringement.
              </p>

            {/* Improvement 531: Screen Reader Accessibility */}
              <h3 role="heading" aria-level={3} className="font-bold mt-4 mb-2">6. Donations</h3>
              <p className="mb-3">
                Entirely voluntary. No features are gated. <strong>All donations are final
                and non-refundable. Chargebacks are not permitted.</strong> Not tax-deductible.
              </p>

            {/* Improvement 532: Screen Reader Accessibility */}
              <h3 role="heading" aria-level={3} className="font-bold mt-4 mb-2">7. Disclaimer of Warranties</h3>
              <p className="mb-3 uppercase text-[10px]">
                The Service is provided "as is" and "as available" without warranties of any kind,
                either express or implied. The Operator makes no warranties regarding AI-generated
                content, security, or fitness for any purpose.
              </p>

            {/* Improvement 533: Screen Reader Accessibility */}
              <h3 role="heading" aria-level={3} className="font-bold mt-4 mb-2">8. Limitation of Liability</h3>
              <p className="mb-3 uppercase text-[10px]">
                To the maximum extent permitted by New Hampshire law, MattyJacks shall not be liable
                for any direct, indirect, incidental, special, consequential, or punitive damages.
                Total liability shall not exceed $50 or amounts paid in the prior 12 months, whichever is less.
              </p>

            {/* Improvement 534: Screen Reader Accessibility */}
              <h3 role="heading" aria-level={3} className="font-bold mt-4 mb-2">9. Dispute Resolution</h3>
              <p className="mb-3">
                Disputes resolved by binding arbitration in New Hampshire (AAA rules). No class actions.
                Jury trial waived. Informal resolution required first (30 days).
              </p>

            {/* Improvement 535: Screen Reader Accessibility */}
              <h3 role="heading" aria-level={3} className="font-bold mt-4 mb-2">10. Governing Law</h3>
              <p className="mb-3">
                Governed by New Hampshire law. Exclusive jurisdiction in New Hampshire courts.
                Licensed under CryptArtist Custom License v1.69.420.3.
              </p>

              <p className="text-xs text-studio-muted mt-6">
                For the full Terms of Use (29 sections), visit the Terms of Use page within the application.
                Contact: Matt@MattyJacks.com | MattyJacks.com/Contact
              </p>
            </div>
          )}

          {activeTab === "privacy" && (
            <div className="text-sm text-studio-text leading-relaxed animate-fade-in">
            {/* Improvement 536: Screen Reader Accessibility */}
              <h2 role="heading" aria-level={2} className="text-base font-bold mb-3">Privacy Policy</h2>
              <p className="text-xs text-studio-muted mb-4">Last updated: March 13, 2026 - Version 1.69.420.3</p>

              <p className="mb-3">
                CryptArtist Studio is operated by <strong>MattyJacks</strong>, a sole proprietorship
                in New Hampshire, United States. This Privacy Policy explains how we collect, use,
                disclose, and safeguard your information.
              </p>

            {/* Improvement 537: Screen Reader Accessibility */}
              <h3 role="heading" aria-level={3} className="font-bold mt-4 mb-2">1. Information We Collect</h3>
              <p className="mb-2"><strong>You provide:</strong> API keys (stored locally, encrypted), contact info if you reach out, donation payment info (processed by third-party processors - we never see card numbers).</p>
              <p className="mb-2"><strong>Collected automatically:</strong> Google Analytics (anonymized), Vercel Analytics (performance), Cloudflare (security, Turnstile bot detection), our own analytics (anonymized patterns).</p>
              <p className="mb-3"><strong>We do NOT collect:</strong> biometric data, GPS location, SSNs, government IDs, or files outside the app's directories. We do not sell your data.</p>

            {/* Improvement 538: Screen Reader Accessibility */}
              <h3 role="heading" aria-level={3} className="font-bold mt-4 mb-2">2. Third-Party Services</h3>
              <p className="mb-3">
                Data transmitted to: OpenAI, OpenRouter, ElevenLabs, Pexels, Supabase - under their
                privacy policies. We do not intercept, log, or store your AI conversations.
              </p>

            {/* Improvement 539: Screen Reader Accessibility */}
              <h3 role="heading" aria-level={3} className="font-bold mt-4 mb-2">3. Data Storage</h3>
              <p className="mb-3">
                All project files, API keys, and creative content stored <strong>locally on your device
                only</strong>. We do not operate cloud storage for user data. Analytics retained max 26 months.
              </p>

            {/* Improvement 540: Screen Reader Accessibility */}
              <h3 role="heading" aria-level={3} className="font-bold mt-4 mb-2">4. Your Rights</h3>
              <p className="mb-3">
                Access, correction, deletion (within 30 days), portability, opt-out of tracking,
                restrict processing, non-discrimination. Covers NH, CCPA/CPRA, GDPR, VCDPA, CPA, CTDPA, UCPA.
                Contact Matt@MattyJacks.com.
              </p>

            {/* Improvement 541: Screen Reader Accessibility */}
              <h3 role="heading" aria-level={3} className="font-bold mt-4 mb-2">5. Children (COPPA)</h3>
              <p className="mb-3">
                Not directed to children under 13. Ages 13-18 require parental supervision.
                We will delete any data collected from children under 13 immediately upon discovery.
              </p>

            {/* Improvement 542: Screen Reader Accessibility */}
              <h3 role="heading" aria-level={3} className="font-bold mt-4 mb-2">6. Breach Notification</h3>
              <p className="mb-3">
                Per NH RSA 359-C:20, affected residents notified without unreasonable delay.
                GDPR-covered individuals notified within 72 hours.
              </p>

            {/* Improvement 543: Screen Reader Accessibility */}
              <h3 role="heading" aria-level={3} className="font-bold mt-4 mb-2">7. Do Not Track</h3>
              <p className="mb-3">
                We respect DNT browser signals and limit tracking when enabled.
              </p>

              <p className="text-xs text-studio-muted mt-6">
                For the full Privacy Policy (13 sections), visit the Privacy Policy page within the application.
                Contact: Matt@MattyJacks.com | MattyJacks.com/Contact
              </p>
            </div>
          )}
        </div>

        {/* Checkboxes + Accept */}
        <div className="border-t border-studio-border px-6 py-4 flex flex-col gap-3">
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={checkedTerms}
              onChange={(e) => setCheckedTerms(e.target.checked)}
              className="accent-studio-cyan mt-0.5"
            />
            <span className="text-xs text-studio-text leading-relaxed">
              I have read and agree to the <strong>Terms of Use</strong>, including the donation
              and chargeback policies.
            </span>
          </label>
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={checkedPrivacy}
              onChange={(e) => setCheckedPrivacy(e.target.checked)}
              className="accent-studio-cyan mt-0.5"
            />
            <span className="text-xs text-studio-text leading-relaxed">
              I have read and agree to the <strong>Privacy Policy</strong>, including the use of
              Google Analytics, Cloudflare, Vercel analytics, and our own analytics suite.
            </span>
          </label>

          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-3 text-[10px] text-studio-muted">
              <a href="mailto:Matt@MattyJacks.com" className="text-studio-cyan hover:underline">Matt@MattyJacks.com</a>
              <span className="text-studio-border">|</span>
              <a href="https://mattyjacks.com/Contact" target="_blank" rel="noopener noreferrer" className="text-studio-cyan hover:underline">MattyJacks.com/Contact</a>
            </div>
            <button type="button"
              onClick={onAccept}
              disabled={!canAccept}
              className={`btn px-6 py-2 text-sm font-semibold ${
                canAccept
                  ? "btn-accent"
                  : "opacity-40 cursor-not-allowed"
              }`}
            >
              I Accept - Continue
            </button>
          </div>
        </div>
      </div>

      {/* Version Footer */}
      <p className="text-[10px] text-studio-muted mt-4">
        {"\u{1F480}\u{1F3A8}"} CryptArtist Studio v0.1.0 - New Hampshire, USA
      </p>
    </div>
  );
}
