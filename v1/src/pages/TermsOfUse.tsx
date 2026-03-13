import { useNavigate } from "react-router-dom";

export default function TermsOfUse() {
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
        <span className="text-[13px] font-bold tracking-tight text-studio-text">Terms of Use</span>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-8 py-10 text-studio-text">
          <h1 className="text-2xl font-bold mb-2">Terms of Use</h1>
          <p className="text-sm text-studio-muted mb-6">
            Last updated: March 13, 2026
          </p>

          <p className="text-sm leading-relaxed mb-4">
            These Terms of Use ("Terms") govern your use of the CryptArtist Studio desktop
            application and related websites (mattyjacks.com, givegigs.com) (collectively,
            the "Service"), operated from New Hampshire, United States. By installing, accessing,
            or using the Service, you agree to be bound by these Terms. If you do not agree to
            these Terms, do not use the Service.
          </p>

          <h2 className="text-lg font-bold mt-8 mb-3">1. Acceptance of Terms</h2>
          <p className="text-sm leading-relaxed mb-4">
            By using CryptArtist Studio, you affirm that you are at least 13 years of age and
            are legally capable of entering into a binding agreement. If you are using the Service
            on behalf of an organization, you represent that you have the authority to bind that
            organization to these Terms.
          </p>

          <h2 className="text-lg font-bold mt-8 mb-3">2. Description of Service</h2>
          <p className="text-sm leading-relaxed mb-4">
            CryptArtist Studio is a creative software suite that includes media editing,
            code editing, screen recording, and AI agent tools. The Service integrates with
            third-party APIs and services that you configure using your own credentials and
            API keys.
          </p>

          <h2 className="text-lg font-bold mt-8 mb-3">3. User Responsibilities</h2>
          <ul className="list-disc pl-6 text-sm leading-relaxed mb-4 flex flex-col gap-1">
            <li>You are responsible for maintaining the confidentiality of your API keys and credentials.</li>
            <li>You are responsible for all activity that occurs under your API keys.</li>
            <li>You agree to use the Service in compliance with all applicable federal, state (including New Hampshire), and local laws and regulations.</li>
            <li>You will not use the Service for any unlawful purpose, including but not limited to creating illegal content, infringing intellectual property, or harassing others.</li>
            <li>You will not attempt to reverse engineer, decompile, or disassemble any proprietary components of the Service beyond what is permitted by applicable law.</li>
          </ul>

          <h2 className="text-lg font-bold mt-8 mb-3">4. Third-Party Services and API Keys</h2>
          <p className="text-sm leading-relaxed mb-4">
            The Service allows you to connect to third-party services including, but not limited to:
          </p>
          <ul className="list-disc pl-6 text-sm leading-relaxed mb-4 flex flex-col gap-1">
            <li><strong>OpenAI API</strong> - for AI chat, image generation, and text-to-speech</li>
            <li><strong>Pexels API</strong> - for stock media search and import</li>
            <li><strong>Supabase/GiveGigs</strong> - for media storage and management</li>
            <li><strong>Vercel</strong> - for website hosting and analytics</li>
            <li><strong>Cloudflare</strong> - for security, performance, and bot detection (Turnstile)</li>
            <li><strong>Google Analytics</strong> - for usage analytics</li>
          </ul>
          <p className="text-sm leading-relaxed mb-4">
            Your use of these third-party services is subject to their respective terms of service
            and privacy policies. We are not responsible for the availability, accuracy, or content
            of third-party services. Any fees charged by third-party services (e.g., OpenAI API
            usage costs) are your sole responsibility.
          </p>

          <h2 className="text-lg font-bold mt-8 mb-3">5. Intellectual Property</h2>
          <p className="text-sm leading-relaxed mb-4">
            The CryptArtist Studio application, including its source code, design, logos
            ({"\u{1F480}\u{1F3A8}"}), and documentation, is the intellectual property of its
            creators. Content you create using the Service belongs to you, subject to the terms
            of any third-party services used in its creation (e.g., OpenAI's usage policies for
            AI-generated content).
          </p>

          <h2 className="text-lg font-bold mt-8 mb-3">6. Donations</h2>
          <p className="text-sm leading-relaxed mb-4">
            CryptArtist Studio is community-funded through voluntary donations at{" "}
            <a href="https://mattyjacks.com" target="_blank" rel="noopener noreferrer" className="text-studio-cyan hover:underline">mattyjacks.com</a>{" "}
            and{" "}
            <a href="https://givegigs.com" target="_blank" rel="noopener noreferrer" className="text-studio-cyan hover:underline">givegigs.com</a>.
          </p>
          <ul className="list-disc pl-6 text-sm leading-relaxed mb-4 flex flex-col gap-1">
            <li>All donations are <strong>entirely voluntary</strong> and made of the donor's own free will.</li>
            <li>No donation is required to use the Service. The Service does not restrict features based on donation status.</li>
            <li>No pressure, coercion, or obligation is placed on any user to donate.</li>
            <li><strong>All donations are final and non-refundable.</strong> By making a donation, you acknowledge that you are making a voluntary contribution and agree not to initiate a chargeback, dispute, or reversal of the transaction. Chargebacks are not permitted. If you have concerns about a donation, please contact us at <a href="mailto:Matt@MattyJacks.com" className="text-studio-cyan hover:underline">Matt@MattyJacks.com</a> before contacting your financial institution.</li>
          </ul>

          <h2 className="text-lg font-bold mt-8 mb-3">7. Disclaimer of Warranties</h2>
          <p className="text-sm leading-relaxed mb-4">
            THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND,
            EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF
            MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT.
            WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE.
          </p>

          <h2 className="text-lg font-bold mt-8 mb-3">8. Limitation of Liability</h2>
          <p className="text-sm leading-relaxed mb-4">
            TO THE MAXIMUM EXTENT PERMITTED BY NEW HAMPSHIRE LAW AND APPLICABLE FEDERAL LAW,
            IN NO EVENT SHALL CRYPTARTIST STUDIO, ITS CREATORS, CONTRIBUTORS, OR AFFILIATES BE
            LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES,
            OR ANY LOSS OF PROFITS, DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES, ARISING
            OUT OF OR IN CONNECTION WITH YOUR USE OF OR INABILITY TO USE THE SERVICE, EVEN IF
            WE HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
          </p>

          <h2 className="text-lg font-bold mt-8 mb-3">9. Indemnification</h2>
          <p className="text-sm leading-relaxed mb-4">
            You agree to indemnify, defend, and hold harmless CryptArtist Studio and its creators
            from and against any claims, liabilities, damages, losses, and expenses (including
            reasonable attorneys' fees) arising out of or in any way connected with your use of
            the Service, your violation of these Terms, or your violation of any third-party rights.
          </p>

          <h2 className="text-lg font-bold mt-8 mb-3">10. Governing Law and Jurisdiction</h2>
          <p className="text-sm leading-relaxed mb-4">
            These Terms shall be governed by and construed in accordance with the laws of the
            State of New Hampshire, United States, without regard to its conflict of law provisions.
            Any legal action or proceeding arising under these Terms shall be brought exclusively
            in the state or federal courts located in New Hampshire, and the parties hereby consent
            to personal jurisdiction and venue therein.
          </p>

          <h2 className="text-lg font-bold mt-8 mb-3">11. Termination</h2>
          <p className="text-sm leading-relaxed mb-4">
            We reserve the right to terminate or suspend your access to the Service at any time,
            with or without cause, with or without notice. Upon termination, your right to use the
            Service will immediately cease. All provisions of these Terms that by their nature
            should survive termination shall survive, including but not limited to ownership
            provisions, warranty disclaimers, indemnity, and limitations of liability.
          </p>

          <h2 className="text-lg font-bold mt-8 mb-3">12. Severability</h2>
          <p className="text-sm leading-relaxed mb-4">
            If any provision of these Terms is found to be unenforceable or invalid under
            New Hampshire law or any applicable law, that provision shall be modified to reflect
            the parties' original intent as nearly as possible, and the remaining provisions shall
            continue in full force and effect.
          </p>

          <h2 className="text-lg font-bold mt-8 mb-3">13. Entire Agreement</h2>
          <p className="text-sm leading-relaxed mb-4">
            These Terms, together with the Privacy Policy, constitute the entire agreement between
            you and CryptArtist Studio regarding your use of the Service, and supersede all prior
            agreements and understandings.
          </p>

          <h2 className="text-lg font-bold mt-8 mb-3">14. Changes to These Terms</h2>
          <p className="text-sm leading-relaxed mb-4">
            We may update these Terms from time to time. Changes will be effective when posted.
            Your continued use of the Service after any changes constitutes acceptance of the
            updated Terms. We encourage you to review this page periodically.
          </p>

          <h2 className="text-lg font-bold mt-8 mb-3">15. Contact Us</h2>
          <p className="text-sm leading-relaxed mb-4">
            If you have questions about these Terms, please contact us:
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
        <span className="text-studio-muted">Terms of Use</span>
      </footer>
    </div>
  );
}
