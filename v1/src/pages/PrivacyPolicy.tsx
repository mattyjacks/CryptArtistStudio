import { useNavigate } from "react-router-dom";

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-screen w-screen bg-studio-bg overflow-hidden">
      {/* Header */}
      <header className="flex items-center h-[44px] bg-studio-panel border-b border-studio-border select-none px-4 gap-3">
        <button
          onClick={() => navigate("/")}
          className="btn-ghost rounded-md px-2 py-1 text-xs hover:bg-studio-hover transition-colors"
          title="Back to Suite"
        >
          {"\u2190"} Back
        </button>
        <div className="w-px h-5 bg-studio-border" />
        <span className="text-xl leading-none">{"\u{1F480}\u{1F3A8}"}</span>
        <span className="text-[13px] font-bold tracking-tight text-studio-text">Privacy Policy</span>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-8 py-10 text-studio-text">
          <h1 className="text-2xl font-bold mb-2">Privacy Policy</h1>
          <p className="text-sm text-studio-muted mb-6">
            Last updated: March 13, 2026
          </p>

          <p className="text-sm leading-relaxed mb-4">
            CryptArtist Studio ("we," "us," or "our") is operated from New Hampshire, United States.
            This Privacy Policy explains how we collect, use, disclose, and safeguard your information
            when you use the CryptArtist Studio desktop application and related websites
            (mattyjacks.com, givegigs.com) (collectively, the "Service"). Please read this Privacy
            Policy carefully. By using the Service, you consent to the practices described herein.
          </p>

          <h2 className="text-lg font-bold mt-8 mb-3">1. Information We Collect</h2>

          <h3 className="text-sm font-bold mt-4 mb-2">1.1 Information You Provide Directly</h3>
          <ul className="list-disc pl-6 text-sm leading-relaxed mb-4 flex flex-col gap-1">
            <li><strong>API Keys:</strong> You may enter API keys (e.g., OpenAI, Pexels, Supabase/GiveGigs). These are stored locally on your device and are only transmitted to their respective third-party services to fulfill your requests.</li>
            <li><strong>Contact Information:</strong> If you contact us via Matt@MattyJacks.com or MattyJacks.com/Contact, we collect the information you voluntarily provide (name, email, message content).</li>
            <li><strong>Donations:</strong> If you make a voluntary donation through mattyjacks.com or givegigs.com, the payment processor may collect payment information. We do not directly store credit card numbers.</li>
          </ul>

          <h3 className="text-sm font-bold mt-4 mb-2">1.2 Information Collected Automatically</h3>
          <ul className="list-disc pl-6 text-sm leading-relaxed mb-4 flex flex-col gap-1">
            <li><strong>Google Analytics:</strong> We use Google Analytics to collect anonymized usage data such as page views, session duration, device type, and approximate geographic location. Google Analytics uses cookies. You can opt out using the Google Analytics Opt-Out Browser Add-on.</li>
            <li><strong>Vercel Analytics & Observability:</strong> Our websites are hosted on Vercel. Vercel may collect performance metrics, error logs, and request metadata (IP addresses, user agents) for operational purposes.</li>
            <li><strong>Cloudflare:</strong> Our websites use Cloudflare for security and performance. Cloudflare may process your IP address, request headers, and browser information. Cloudflare Turnstile is used for bot detection and does not use traditional cookies - it analyzes browser signals to verify you are human.</li>
            <li><strong>Our Own Analytics Suite:</strong> We operate a proprietary analytics system that may collect anonymized usage patterns, feature adoption metrics, and error reports to improve the Service.</li>
          </ul>

          <h3 className="text-sm font-bold mt-4 mb-2">1.3 Third-Party Services</h3>
          <p className="text-sm leading-relaxed mb-4">
            When you use features that rely on third-party APIs, your data is transmitted to those
            services under their respective privacy policies:
          </p>
          <ul className="list-disc pl-6 text-sm leading-relaxed mb-4 flex flex-col gap-1">
            <li><strong>OpenAI API:</strong> Chat messages, image prompts, and text-to-speech requests are sent to OpenAI. See <a href="https://openai.com/privacy" target="_blank" rel="noopener noreferrer" className="text-studio-cyan hover:underline">OpenAI's Privacy Policy</a>.</li>
            <li><strong>Pexels API:</strong> Search queries for stock media are sent to Pexels. See <a href="https://www.pexels.com/privacy-policy/" target="_blank" rel="noopener noreferrer" className="text-studio-cyan hover:underline">Pexels' Privacy Policy</a>.</li>
            <li><strong>Supabase (GiveGigs):</strong> If configured, media data may be transmitted to your Supabase instance. See <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="text-studio-cyan hover:underline">Supabase's Privacy Policy</a>.</li>
          </ul>

          <h2 className="text-lg font-bold mt-8 mb-3">2. How We Use Your Information</h2>
          <ul className="list-disc pl-6 text-sm leading-relaxed mb-4 flex flex-col gap-1">
            <li>To provide, maintain, and improve the Service</li>
            <li>To process your requests and fulfill features you use</li>
            <li>To analyze usage patterns and optimize performance</li>
            <li>To detect and prevent security threats or abuse</li>
            <li>To respond to your inquiries and provide support</li>
            <li>To comply with legal obligations</li>
          </ul>

          <h2 className="text-lg font-bold mt-8 mb-3">3. How We Share Your Information</h2>
          <p className="text-sm leading-relaxed mb-4">
            We do not sell your personal information. We may share information with:
          </p>
          <ul className="list-disc pl-6 text-sm leading-relaxed mb-4 flex flex-col gap-1">
            <li><strong>Service Providers:</strong> Third-party services listed above that help us operate the Service (Vercel, Cloudflare, Google Analytics).</li>
            <li><strong>Legal Requirements:</strong> When required by law, regulation, legal process, or governmental request, including under New Hampshire RSA 359-C (Right to Privacy Act).</li>
            <li><strong>Protection of Rights:</strong> To protect the rights, property, or safety of CryptArtist Studio, our users, or the public.</li>
          </ul>

          <h2 className="text-lg font-bold mt-8 mb-3">4. Data Storage and Security</h2>
          <p className="text-sm leading-relaxed mb-4">
            API keys and project files are stored locally on your device. We implement reasonable
            administrative, technical, and physical safeguards to protect information transmitted
            to our servers. However, no method of electronic transmission or storage is 100% secure.
          </p>

          <h2 className="text-lg font-bold mt-8 mb-3">5. Your Rights</h2>
          <p className="text-sm leading-relaxed mb-4">
            Under New Hampshire law and applicable federal law, you have the right to:
          </p>
          <ul className="list-disc pl-6 text-sm leading-relaxed mb-4 flex flex-col gap-1">
            <li>Request access to personal information we hold about you</li>
            <li>Request correction of inaccurate personal information</li>
            <li>Request deletion of your personal information</li>
            <li>Opt out of analytics tracking (see Section 1.2)</li>
          </ul>
          <p className="text-sm leading-relaxed mb-4">
            To exercise these rights, contact us at{" "}
            <a href="mailto:Matt@MattyJacks.com" className="text-studio-cyan hover:underline">Matt@MattyJacks.com</a>{" "}
            or visit{" "}
            <a href="https://mattyjacks.com/Contact" target="_blank" rel="noopener noreferrer" className="text-studio-cyan hover:underline">MattyJacks.com/Contact</a>.
          </p>

          <h2 className="text-lg font-bold mt-8 mb-3">6. Children's Privacy</h2>
          <p className="text-sm leading-relaxed mb-4">
            The Service is not directed to children under 13. We do not knowingly collect personal
            information from children under 13. If you believe we have collected such information,
            please contact us immediately and we will promptly delete it.
          </p>

          <h2 className="text-lg font-bold mt-8 mb-3">7. New Hampshire-Specific Provisions</h2>
          <p className="text-sm leading-relaxed mb-4">
            In accordance with New Hampshire RSA 359-C (Right to Privacy Act) and RSA 359-C:20
            (Notice of Security Breach), we will notify affected New Hampshire residents of any
            security breach involving personal information without unreasonable delay, consistent
            with the legitimate needs of law enforcement and any measures necessary to determine
            the scope of the breach and restore the reasonable integrity of the data system.
          </p>

          <h2 className="text-lg font-bold mt-8 mb-3">8. Linked Websites</h2>
          <p className="text-sm leading-relaxed mb-4">
            The Service is linked with{" "}
            <a href="https://mattyjacks.com" target="_blank" rel="noopener noreferrer" className="text-studio-cyan hover:underline">mattyjacks.com</a>{" "}
            and{" "}
            <a href="https://givegigs.com" target="_blank" rel="noopener noreferrer" className="text-studio-cyan hover:underline">givegigs.com</a>.
            These websites may have their own privacy practices. We encourage you to review
            their privacy policies. This Privacy Policy applies to the CryptArtist Studio
            application and the domains we operate.
          </p>

          <h2 className="text-lg font-bold mt-8 mb-3">9. Changes to This Policy</h2>
          <p className="text-sm leading-relaxed mb-4">
            We may update this Privacy Policy from time to time. Changes will be effective when
            posted. Your continued use of the Service after any changes constitutes acceptance
            of the updated policy. We encourage you to review this page periodically.
          </p>

          <h2 className="text-lg font-bold mt-8 mb-3">10. Contact Us</h2>
          <p className="text-sm leading-relaxed mb-4">
            If you have questions about this Privacy Policy, please contact us:
          </p>
          <ul className="list-disc pl-6 text-sm leading-relaxed mb-4 flex flex-col gap-1">
            <li><strong>Email:</strong> <a href="mailto:Matt@MattyJacks.com" className="text-studio-cyan hover:underline">Matt@MattyJacks.com</a></li>
            <li><strong>Contact Page:</strong> <a href="https://mattyjacks.com/Contact" target="_blank" rel="noopener noreferrer" className="text-studio-cyan hover:underline">MattyJacks.com/Contact</a></li>
          </ul>

          <div className="border-t border-studio-border mt-10 pt-6 text-center">
            <p className="text-xs text-studio-muted">
              {"\u{1F480}\u{1F3A8}"} CryptArtist Studio - New Hampshire, USA
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="status-bar">
        <span>{"\u{1F480}\u{1F3A8}"} CryptArtist Studio</span>
        <span className="text-studio-muted">Privacy Policy</span>
      </footer>
    </div>
  );
}
