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
    <div className="flex flex-col h-screen w-screen bg-studio-bg overflow-hidden items-center justify-center">
      <div className="w-full max-w-2xl bg-studio-panel border border-studio-border rounded-xl shadow-2xl shadow-black/50 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-studio-border">
          <span className="text-3xl">{"\u{1F480}\u{1F3A8}"}</span>
          <div>
            <h1 className="text-lg font-bold text-studio-text">Welcome to CryptArtist Studio</h1>
            <p className="text-xs text-studio-muted">Please review and accept our Terms of Use and Privacy Policy to continue.</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-studio-border px-4">
          <button
            onClick={() => setActiveTab("terms")}
            className={`px-4 py-2.5 text-[11px] font-semibold transition-colors border-b-2 -mb-px ${
              activeTab === "terms"
                ? "border-studio-cyan text-studio-cyan"
                : "border-transparent text-studio-muted hover:text-studio-text"
            }`}
          >
            {"\u{1F4DC}"} Terms of Use {scrolledTerms && "\u2705"}
          </button>
          <button
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
              <h2 className="text-base font-bold mb-3">Terms of Use</h2>
              <p className="text-xs text-studio-muted mb-4">Last updated: March 13, 2026</p>

              <p className="mb-3">
                These Terms of Use ("Terms") govern your use of the CryptArtist Studio desktop
                application and related websites (mattyjacks.com, givegigs.com) (collectively,
                the "Service"), operated from New Hampshire, United States. By installing, accessing,
                or using the Service, you agree to be bound by these Terms.
              </p>

              <h3 className="font-bold mt-4 mb-2">1. Acceptance of Terms</h3>
              <p className="mb-3">
                By using CryptArtist Studio, you affirm that you are at least 13 years of age and
                are legally capable of entering into a binding agreement.
              </p>

              <h3 className="font-bold mt-4 mb-2">2. Description of Service</h3>
              <p className="mb-3">
                CryptArtist Studio is a creative software suite that includes media editing,
                code editing, screen recording, and AI agent tools. The Service integrates with
                third-party APIs and services that you configure using your own credentials.
              </p>

              <h3 className="font-bold mt-4 mb-2">3. User Responsibilities</h3>
              <p className="mb-3">
                You are responsible for maintaining the confidentiality of your API keys and credentials,
                and for all activity under your keys. You agree to use the Service in compliance with
                all applicable federal, state (including New Hampshire), and local laws.
              </p>

              <h3 className="font-bold mt-4 mb-2">4. Third-Party Services</h3>
              <p className="mb-3">
                The Service connects to: OpenAI API, Pexels API, Supabase/GiveGigs, Vercel,
                Cloudflare (including Turnstile), and Google Analytics. Your use of these is subject
                to their respective terms. Any third-party API fees are your responsibility.
              </p>

              <h3 className="font-bold mt-4 mb-2">5. Donations</h3>
              <p className="mb-3">
                CryptArtist Studio is community-funded through voluntary donations at mattyjacks.com
                and givegigs.com. All donations are entirely voluntary, made of the donor's own free will,
                and no pressure or obligation is placed on any user. <strong>All donations are final
                and non-refundable. Chargebacks are not permitted.</strong>
              </p>

              <h3 className="font-bold mt-4 mb-2">6. Disclaimer of Warranties</h3>
              <p className="mb-3 uppercase text-[10px]">
                The Service is provided "as is" and "as available" without warranties of any kind,
                either express or implied. We do not warrant that the Service will be uninterrupted,
                error-free, or secure.
              </p>

              <h3 className="font-bold mt-4 mb-2">7. Limitation of Liability</h3>
              <p className="mb-3 uppercase text-[10px]">
                To the maximum extent permitted by New Hampshire law, in no event shall CryptArtist
                Studio be liable for any indirect, incidental, special, consequential, or punitive
                damages arising out of your use of the Service.
              </p>

              <h3 className="font-bold mt-4 mb-2">8. Governing Law</h3>
              <p className="mb-3">
                These Terms shall be governed by the laws of the State of New Hampshire, United States.
                Any legal action shall be brought exclusively in New Hampshire courts.
              </p>

              <p className="text-xs text-studio-muted mt-6">
                For the full Terms of Use, visit the Terms of Use page within the application.
                Contact: Matt@MattyJacks.com | MattyJacks.com/Contact
              </p>
            </div>
          )}

          {activeTab === "privacy" && (
            <div className="text-sm text-studio-text leading-relaxed animate-fade-in">
              <h2 className="text-base font-bold mb-3">Privacy Policy</h2>
              <p className="text-xs text-studio-muted mb-4">Last updated: March 13, 2026</p>

              <p className="mb-3">
                CryptArtist Studio ("we," "us," or "our") is operated from New Hampshire, United States.
                This Privacy Policy explains how we collect, use, and safeguard your information.
              </p>

              <h3 className="font-bold mt-4 mb-2">1. Information We Collect</h3>
              <p className="mb-2"><strong>You provide:</strong> API keys (stored locally on your device), contact info if you reach out, donation payment info (processed by third-party payment processors).</p>
              <p className="mb-3"><strong>Collected automatically:</strong> Google Analytics (anonymized usage data, cookies), Vercel Analytics & Observability (performance metrics, error logs, IP addresses), Cloudflare (IP, headers, Turnstile bot detection), and our own analytics suite (anonymized usage patterns).</p>

              <h3 className="font-bold mt-4 mb-2">2. Third-Party Services</h3>
              <p className="mb-3">
                When you use features relying on third-party APIs (OpenAI, Pexels, Supabase), your data
                is transmitted to those services under their privacy policies. We also use Vercel for
                hosting, Cloudflare for security and performance (including Cloudflare Turnstile for
                bot detection), and Google Analytics for usage analytics.
              </p>

              <h3 className="font-bold mt-4 mb-2">3. How We Use Information</h3>
              <p className="mb-3">
                To provide and improve the Service, process your requests, analyze usage, detect
                security threats, respond to inquiries, and comply with legal obligations.
              </p>

              <h3 className="font-bold mt-4 mb-2">4. Data Sharing</h3>
              <p className="mb-3">
                We do not sell your personal information. We share data only with service providers
                that help operate the Service, when required by law (including NH RSA 359-C), or
                to protect rights, property, or safety.
              </p>

              <h3 className="font-bold mt-4 mb-2">5. Your Rights</h3>
              <p className="mb-3">
                Under New Hampshire law you may request access to, correction of, or deletion of your
                personal information, and opt out of analytics. Contact Matt@MattyJacks.com or
                MattyJacks.com/Contact.
              </p>

              <h3 className="font-bold mt-4 mb-2">6. Security Breach Notification</h3>
              <p className="mb-3">
                Per NH RSA 359-C:20, we will notify affected New Hampshire residents of any security
                breach involving personal information without unreasonable delay.
              </p>

              <h3 className="font-bold mt-4 mb-2">7. Linked Websites</h3>
              <p className="mb-3">
                The Service is linked with mattyjacks.com and givegigs.com. We encourage you to review
                their privacy practices.
              </p>

              <p className="text-xs text-studio-muted mt-6">
                For the full Privacy Policy, visit the Privacy Policy page within the application.
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
              <span>|</span>
              <a href="https://mattyjacks.com/Contact" target="_blank" rel="noopener noreferrer" className="text-studio-cyan hover:underline">MattyJacks.com/Contact</a>
            </div>
            <button
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
