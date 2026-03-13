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
            Last updated: March 13, 2026 - Version 1.69.420.3
          </p>

          <p className="text-sm leading-relaxed mb-4">
            CryptArtist Studio is operated by <strong>MattyJacks</strong>, a sole proprietorship
            based in New Hampshire, United States ("Operator," "we," "us," or "our"). This
            Privacy Policy explains how we collect, use, disclose, and safeguard your information
            when you use the CryptArtist Studio desktop application and related websites
            (mattyjacks.com, givegigs.com) (collectively, the "Service"). Please read this Privacy
            Policy carefully. By using the Service, you consent to the practices described herein.
            If you do not agree with this Privacy Policy, please do not use the Service.
          </p>

          <h2 className="text-lg font-bold mt-8 mb-3">1. Information We Collect</h2>

          <h3 className="text-sm font-bold mt-4 mb-2">1.1 Information You Provide Directly</h3>
          <ul className="list-disc pl-6 text-sm leading-relaxed mb-4 flex flex-col gap-1">
            <li><strong>API Keys:</strong> You may enter API keys (e.g., OpenAI, OpenRouter, ElevenLabs, Pexels, Supabase/GiveGigs). These are stored locally on your device using encrypted localStorage and are only transmitted to their respective third-party services to fulfill your requests. We do not have access to your API keys.</li>
            <li><strong>Contact Information:</strong> If you contact us via Matt@MattyJacks.com or MattyJacks.com/Contact, we collect the information you voluntarily provide (name, email, message content).</li>
            <li><strong>Donations:</strong> If you make a voluntary donation through mattyjacks.com or givegigs.com, the payment processor may collect payment information. We do not directly store, process, or have access to credit card numbers or bank account details.</li>
            <li><strong>Project Files:</strong> .CryptArt project files and all media, code, and creative content are stored exclusively on your local device. We do not upload, access, or process your project files.</li>
            <li><strong>AI Prompts and Conversations:</strong> Text you enter into AI features is transmitted to the third-party AI provider you have configured (OpenAI, OpenRouter, ElevenLabs). We do not store, log, or have access to your AI conversations.</li>
          </ul>

          <h3 className="text-sm font-bold mt-4 mb-2">1.2 Information Collected Automatically</h3>
          <ul className="list-disc pl-6 text-sm leading-relaxed mb-4 flex flex-col gap-1">
            <li><strong>Google Analytics:</strong> We use Google Analytics to collect anonymized usage data such as page views, session duration, device type, and approximate geographic location. Google Analytics uses cookies. You can opt out using the <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer" className="text-studio-cyan hover:underline">Google Analytics Opt-Out Browser Add-on</a>.</li>
            <li><strong>Vercel Analytics & Observability:</strong> Our websites are hosted on Vercel. Vercel may collect performance metrics, error logs, and request metadata (IP addresses, user agents) for operational purposes.</li>
            <li><strong>Cloudflare:</strong> Our websites use Cloudflare for security and performance. Cloudflare may process your IP address, request headers, and browser information. Cloudflare Turnstile is used for bot detection and does not use traditional cookies - it analyzes browser signals to verify you are human.</li>
            <li><strong>Our Own Analytics Suite:</strong> We operate a proprietary analytics system that may collect anonymized usage patterns, feature adoption metrics, and error reports to improve the Service. This data is aggregated and cannot be used to identify individual users.</li>
            <li><strong>Crash Reports and Error Logs:</strong> The desktop application may generate local error logs stored on your device. These are not automatically transmitted to us unless you choose to share them.</li>
          </ul>

          <h3 className="text-sm font-bold mt-4 mb-2">1.3 Information We Do NOT Collect</h3>
          <ul className="list-disc pl-6 text-sm leading-relaxed mb-4 flex flex-col gap-1">
            <li>We do not collect biometric data.</li>
            <li>We do not collect precise geolocation data (GPS).</li>
            <li>We do not collect Social Security numbers or government IDs.</li>
            <li>We do not scan or access files on your device outside of the Service's working directories.</li>
            <li>We do not use fingerprinting or cross-site tracking beyond the analytics services disclosed above.</li>
            <li>We do not sell, rent, or trade your personal information to third parties for marketing purposes.</li>
          </ul>

          <h3 className="text-sm font-bold mt-4 mb-2">1.4 Third-Party Services</h3>
          <p className="text-sm leading-relaxed mb-4">
            When you use features that rely on third-party APIs, your data is transmitted to those
            services under their respective privacy policies:
          </p>
          <ul className="list-disc pl-6 text-sm leading-relaxed mb-4 flex flex-col gap-1">
            <li><strong>OpenAI API:</strong> Chat messages, image prompts, and text-to-speech requests are sent to OpenAI. See <a href="https://openai.com/privacy" target="_blank" rel="noopener noreferrer" className="text-studio-cyan hover:underline">OpenAI's Privacy Policy</a>.</li>
            <li><strong>OpenRouter:</strong> When configured, AI chat requests are routed through OpenRouter to access 200+ models from multiple providers. See <a href="https://openrouter.ai/privacy" target="_blank" rel="noopener noreferrer" className="text-studio-cyan hover:underline">OpenRouter's Privacy Policy</a>.</li>
            <li><strong>ElevenLabs API:</strong> Text-to-speech, speech-to-text, and sound effect prompts are sent to ElevenLabs. See <a href="https://elevenlabs.io/privacy" target="_blank" rel="noopener noreferrer" className="text-studio-cyan hover:underline">ElevenLabs' Privacy Policy</a>.</li>
            <li><strong>Pexels API:</strong> Search queries for stock media are sent to Pexels. See <a href="https://www.pexels.com/privacy-policy/" target="_blank" rel="noopener noreferrer" className="text-studio-cyan hover:underline">Pexels' Privacy Policy</a>.</li>
            <li><strong>Supabase (GiveGigs):</strong> If configured, media data may be transmitted to your Supabase instance. See <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="text-studio-cyan hover:underline">Supabase's Privacy Policy</a>.</li>
          </ul>
          <p className="text-sm leading-relaxed mb-4">
            We are not responsible for the privacy practices of third-party services. We encourage
            you to review the privacy policies of each service before providing your API keys.
          </p>

          <h2 className="text-lg font-bold mt-8 mb-3">2. How We Use Your Information</h2>
          <ul className="list-disc pl-6 text-sm leading-relaxed mb-4 flex flex-col gap-1">
            <li>To provide, maintain, and improve the Service</li>
            <li>To process your requests and fulfill features you use</li>
            <li>To analyze aggregated, anonymized usage patterns and optimize performance</li>
            <li>To detect and prevent security threats, abuse, or fraud</li>
            <li>To respond to your inquiries and provide support</li>
            <li>To comply with legal obligations under New Hampshire and federal law</li>
            <li>To enforce our Terms of Use and protect our legal rights</li>
            <li>To improve AI features and user experience based on anonymized aggregate data</li>
          </ul>

          <h2 className="text-lg font-bold mt-8 mb-3">3. How We Share Your Information</h2>
          <p className="text-sm leading-relaxed mb-4">
            <strong>We do not sell, rent, or trade your personal information.</strong> We may share information with:
          </p>
          <ul className="list-disc pl-6 text-sm leading-relaxed mb-4 flex flex-col gap-1">
            <li><strong>Service Providers:</strong> Third-party services listed above that help us operate the Service (Vercel, Cloudflare, Google Analytics). These providers process data on our behalf and are contractually obligated to protect your information.</li>
            <li><strong>Legal Requirements:</strong> When required by law, regulation, legal process, subpoena, court order, or governmental request, including under New Hampshire RSA 359-C (Right to Privacy Act).</li>
            <li><strong>Protection of Rights:</strong> To protect the rights, property, or safety of MattyJacks, our users, or the public, including to enforce our Terms of Use.</li>
            <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, reorganization, or sale of assets, your information may be transferred as part of the transaction. We will notify users of any such transfer.</li>
            <li><strong>With Your Consent:</strong> We may share information with third parties when you have given explicit consent.</li>
          </ul>

          <h2 className="text-lg font-bold mt-8 mb-3">4. Cookies and Tracking Technologies</h2>
          <p className="text-sm leading-relaxed mb-4">
            Our websites use the following cookies and tracking technologies:
          </p>
          <ul className="list-disc pl-6 text-sm leading-relaxed mb-4 flex flex-col gap-1">
            <li><strong>Google Analytics Cookies:</strong> _ga, _gid, _gat - Used for anonymized usage analytics. Expire after 2 years, 24 hours, and 1 minute respectively.</li>
            <li><strong>Cloudflare Cookies:</strong> __cf_bm - Used for bot detection. Expires after 30 minutes.</li>
            <li><strong>Vercel Analytics:</strong> May use session-based cookies for performance metrics.</li>
            <li><strong>Local Storage:</strong> The desktop application uses encrypted localStorage on your device to store preferences, API keys, and workspace state. This data never leaves your device.</li>
          </ul>
          <p className="text-sm leading-relaxed mb-4">
            <strong>Do Not Track:</strong> We respect Do Not Track (DNT) browser signals. When DNT
            is enabled, we will limit tracking to essential operational analytics only.
          </p>

          <h2 className="text-lg font-bold mt-8 mb-3">5. Data Storage, Security, and Retention</h2>
          <p className="text-sm leading-relaxed mb-4">
            API keys, project files, and all creative content are stored <strong>locally on your
            device</strong>. We do not operate cloud storage for user data. We implement reasonable
            administrative, technical, and physical safeguards to protect information transmitted
            to our servers.
          </p>
          <ul className="list-disc pl-6 text-sm leading-relaxed mb-4 flex flex-col gap-1">
            <li>CryptArtist Studio includes 300 security vulnerability fixes.</li>
            <li>All API keys are stored in encrypted localStorage.</li>
            <li>Peer-to-peer connections use cryptographic identifiers.</li>
            <li>No method of electronic transmission or storage is 100% secure. We cannot guarantee absolute security.</li>
            <li>We retain analytics data for a maximum of 26 months, after which it is automatically deleted.</li>
            <li>Contact form submissions are retained for as long as necessary to respond and resolve inquiries.</li>
            <li>We do not retain any data from third-party API requests - these are transmitted directly from your device to the API provider.</li>
          </ul>

          <h2 className="text-lg font-bold mt-8 mb-3">5a. Peer-to-Peer Resource Sharing (DonatePersonalSeconds)</h2>
          <p className="text-sm leading-relaxed mb-4">
            The DonatePersonalSeconds feature enables voluntary peer-to-peer compute resource
            sharing. When using this feature:
          </p>
          <ul className="list-disc pl-6 text-sm leading-relaxed mb-4 flex flex-col gap-1">
            <li>Your device may communicate directly with other users' devices.</li>
            <li>All connections use cryptographically secure peer identifiers and password verification.</li>
            <li>No personal information is shared beyond anonymized resource metrics (CPU, RAM, GPU usage percentages).</li>
            <li>Your IP address may be visible to peers you connect with directly (as with any peer-to-peer protocol).</li>
            <li>We do not log, store, or monitor peer-to-peer connections or shared resources.</li>
            <li>You may disable this feature at any time.</li>
          </ul>

          <h2 className="text-lg font-bold mt-8 mb-3">5b. AI-Generated Content Privacy</h2>
          <p className="text-sm leading-relaxed mb-4">
            When you use AI features in CryptArtist Studio:
          </p>
          <ul className="list-disc pl-6 text-sm leading-relaxed mb-4 flex flex-col gap-1">
            <li>Your prompts, text, and media inputs are sent directly from your device to the configured AI provider (OpenAI, OpenRouter, ElevenLabs).</li>
            <li>We do not intercept, log, store, or process your AI interactions.</li>
            <li>The AI provider's privacy policy governs how your data is handled after transmission.</li>
            <li>AI-generated outputs are stored locally on your device only.</li>
            <li>We recommend not including sensitive personal information in AI prompts.</li>
          </ul>

          <h2 className="text-lg font-bold mt-8 mb-3">6. Your Rights</h2>
          <p className="text-sm leading-relaxed mb-4">
            Under New Hampshire law and applicable federal law, you have the right to:
          </p>
          <ul className="list-disc pl-6 text-sm leading-relaxed mb-4 flex flex-col gap-1">
            <li><strong>Access:</strong> Request access to personal information we hold about you.</li>
            <li><strong>Correction:</strong> Request correction of inaccurate personal information.</li>
            <li><strong>Deletion:</strong> Request deletion of your personal information. We will comply within 30 days.</li>
            <li><strong>Portability:</strong> Request a copy of your data in a machine-readable format.</li>
            <li><strong>Opt-Out:</strong> Opt out of analytics tracking (see Section 1.2) and marketing communications.</li>
            <li><strong>Restrict Processing:</strong> Request that we limit our processing of your personal information.</li>
            <li><strong>Non-Discrimination:</strong> We will not discriminate against you for exercising any of these rights.</li>
          </ul>
          <p className="text-sm leading-relaxed mb-4">
            To exercise these rights, contact us at{" "}
            <a href="mailto:Matt@MattyJacks.com" className="text-studio-cyan hover:underline">Matt@MattyJacks.com</a>{" "}
            or visit{" "}
            <a href="https://mattyjacks.com/Contact" target="_blank" rel="noopener noreferrer" className="text-studio-cyan hover:underline">MattyJacks.com/Contact</a>.
            We will respond to all requests within 30 days. We may request verification of your
            identity before processing your request.
          </p>

          <h2 className="text-lg font-bold mt-8 mb-3">7. Children's Privacy (COPPA Compliance)</h2>
          <p className="text-sm leading-relaxed mb-4">
            The Service is not directed to children under 13. We do not knowingly collect personal
            information from children under 13. In compliance with the Children's Online Privacy
            Protection Act (COPPA):
          </p>
          <ul className="list-disc pl-6 text-sm leading-relaxed mb-4 flex flex-col gap-1">
            <li>We do not knowingly solicit data from children under 13.</li>
            <li>If we discover we have collected personal information from a child under 13, we will delete it immediately.</li>
            <li>Parents or guardians who believe their child has provided personal information may contact us at Matt@MattyJacks.com for immediate deletion.</li>
            <li>Users between 13 and 18 should use the Service only with parental or guardian supervision and consent.</li>
          </ul>

          <h2 className="text-lg font-bold mt-8 mb-3">8. State-Specific Privacy Rights</h2>

          <h3 className="text-sm font-bold mt-4 mb-2">8.1 New Hampshire Residents</h3>
          <p className="text-sm leading-relaxed mb-4">
            In accordance with New Hampshire RSA 359-C (Right to Privacy Act) and RSA 359-C:20
            (Notice of Security Breach), we will notify affected New Hampshire residents of any
            security breach involving personal information without unreasonable delay, consistent
            with the legitimate needs of law enforcement and any measures necessary to determine
            the scope of the breach and restore the reasonable integrity of the data system.
          </p>

          <h3 className="text-sm font-bold mt-4 mb-2">8.2 California Residents (CCPA/CPRA)</h3>
          <p className="text-sm leading-relaxed mb-4">
            If you are a California resident, you have additional rights under the California
            Consumer Privacy Act (CCPA) and California Privacy Rights Act (CPRA):
          </p>
          <ul className="list-disc pl-6 text-sm leading-relaxed mb-4 flex flex-col gap-1">
            <li>Right to know what personal information we collect, use, and disclose.</li>
            <li>Right to delete personal information we hold about you.</li>
            <li>Right to opt out of the "sale" of personal information. We do not sell personal information.</li>
            <li>Right to non-discrimination for exercising your CCPA rights.</li>
            <li>Right to correct inaccurate personal information.</li>
            <li>Right to limit use of sensitive personal information.</li>
          </ul>

          <h3 className="text-sm font-bold mt-4 mb-2">8.3 EU/EEA Residents (GDPR)</h3>
          <p className="text-sm leading-relaxed mb-4">
            If you are located in the European Union or European Economic Area, you have
            rights under the General Data Protection Regulation (GDPR), including the right to
            access, rectify, erase, restrict processing, data portability, and object to
            processing. Our lawful basis for processing is consent (which you may withdraw at
            any time) and legitimate interests (service improvement, security). To exercise
            GDPR rights, contact us at Matt@MattyJacks.com.
          </p>

          <h3 className="text-sm font-bold mt-4 mb-2">8.4 Other U.S. State Privacy Laws</h3>
          <p className="text-sm leading-relaxed mb-4">
            We are committed to complying with applicable state privacy laws, including those
            in Virginia (VCDPA), Colorado (CPA), Connecticut (CTDPA), Utah (UCPA), and other
            states as enacted. Residents of these states may exercise their applicable rights
            by contacting us at Matt@MattyJacks.com.
          </p>

          <h2 className="text-lg font-bold mt-8 mb-3">9. International Data Transfers</h2>
          <p className="text-sm leading-relaxed mb-4">
            The Service is operated from the United States. If you are accessing the Service
            from outside the United States, please be aware that your information may be
            transferred to, stored, and processed in the United States. By using the Service,
            you consent to the transfer of your information to the United States, which may
            have different data protection laws than your country of residence.
          </p>

          <h2 className="text-lg font-bold mt-8 mb-3">10. Linked Websites</h2>
          <p className="text-sm leading-relaxed mb-4">
            The Service is linked with{" "}
            <a href="https://mattyjacks.com" target="_blank" rel="noopener noreferrer" className="text-studio-cyan hover:underline">mattyjacks.com</a>{" "}
            and{" "}
            <a href="https://givegigs.com" target="_blank" rel="noopener noreferrer" className="text-studio-cyan hover:underline">givegigs.com</a>.
            These websites may have their own privacy practices. We encourage you to review
            their privacy policies. This Privacy Policy applies to the CryptArtist Studio
            application and the domains we operate. We are not responsible for the privacy
            practices of any third-party websites linked from the Service.
          </p>

          <h2 className="text-lg font-bold mt-8 mb-3">11. Data Breach Notification</h2>
          <p className="text-sm leading-relaxed mb-4">
            In the event of a data breach affecting your personal information, we will:
          </p>
          <ul className="list-disc pl-6 text-sm leading-relaxed mb-4 flex flex-col gap-1">
            <li>Notify affected users without unreasonable delay (and within 72 hours for GDPR-covered individuals).</li>
            <li>Notify the New Hampshire Attorney General as required by NH RSA 359-C:20.</li>
            <li>Describe the nature of the breach, the data affected, and steps taken to mitigate harm.</li>
            <li>Provide recommendations for protecting yourself from potential harm.</li>
            <li>Cooperate fully with law enforcement investigations as applicable.</li>
          </ul>

          <h2 className="text-lg font-bold mt-8 mb-3">12. Changes to This Policy</h2>
          <p className="text-sm leading-relaxed mb-4">
            We may update this Privacy Policy from time to time at our sole discretion. Changes
            will be effective when posted. Material changes will be indicated by updating the
            "Last updated" date at the top of this page. Your continued use of the Service after
            any changes constitutes acceptance of the updated policy. We encourage you to review
            this page periodically. If you do not agree to the modified policy, you must
            discontinue use of the Service.
          </p>

          <h2 className="text-lg font-bold mt-8 mb-3">13. Contact Us</h2>
          <p className="text-sm leading-relaxed mb-4">
            If you have questions about this Privacy Policy, please contact the Operator:
          </p>
          <ul className="list-disc pl-6 text-sm leading-relaxed mb-4 flex flex-col gap-1">
            <li><strong>Operator:</strong> MattyJacks (Sole Proprietorship)</li>
            <li><strong>Location:</strong> New Hampshire, United States</li>
            <li><strong>Email:</strong> <a href="mailto:Matt@MattyJacks.com" className="text-studio-cyan hover:underline">Matt@MattyJacks.com</a></li>
            <li><strong>Contact Page:</strong> <a href="https://mattyjacks.com/Contact" target="_blank" rel="noopener noreferrer" className="text-studio-cyan hover:underline">MattyJacks.com/Contact</a></li>
            <li><strong>Response Time:</strong> We aim to respond to all privacy inquiries within 30 days.</li>
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
