/* Wave2: type=button applied */
import { useNavigate } from "react-router-dom";

export default function TermsOfUse() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-full w-full bg-studio-bg overflow-hidden">
      {/* Header */}
      <header className="flex items-center h-[44px] bg-studio-panel border-b border-studio-border select-none px-4 gap-3">
        <button type="button"
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
            Last updated: March 13, 2026 - Version 1.69.420.3
          </p>

          <p className="text-sm leading-relaxed mb-4">
            These Terms of Use ("Terms") govern your use of the CryptArtist Studio desktop
            application and related websites (mattyjacks.com, givegigs.com) (collectively,
            the "Service"), operated by <strong>MattyJacks</strong>, a sole proprietorship
            registered and operating in the State of New Hampshire, United States ("Operator,"
            "we," "us," or "our"). By installing, accessing, or using the Service, you ("User,"
            "you," or "your") agree to be bound by these Terms. If you do not agree to these
            Terms, do not install, access, or use the Service.
          </p>

          <h2 className="text-lg font-bold mt-8 mb-3">1. Acceptance of Terms</h2>
          <p className="text-sm leading-relaxed mb-4">
            By using CryptArtist Studio, you affirm that you are at least 13 years of age and
            are legally capable of entering into a binding agreement. If you are using the Service
            on behalf of an organization, you represent and warrant that you have the authority
            to bind that organization to these Terms. If you are under 18, you represent that
            your parent or legal guardian has reviewed and agreed to these Terms on your behalf.
          </p>

          <h2 className="text-lg font-bold mt-8 mb-3">2. Sole Proprietorship Notice</h2>
          <p className="text-sm leading-relaxed mb-4">
            CryptArtist Studio is operated by MattyJacks, a sole proprietorship based in
            New Hampshire, USA. The Operator is an individual operating under a business name
            and is not a corporation, LLC, or other limited liability entity. All references
            to "CryptArtist Studio," "the Operator," "we," "us," or "our" in these Terms refer
            to MattyJacks, the sole proprietor. The Operator reserves all rights not expressly
            granted herein.
          </p>

          <h2 className="text-lg font-bold mt-8 mb-3">3. Description of Service</h2>
          <p className="text-sm leading-relaxed mb-4">
            CryptArtist Studio is a creative software suite that includes media editing
            (Media Mogul), code editing (VibeCodeWorker), screen recording (DemoRecorder),
            AI agent tools (ValleyNet), game development (GameStudio), a built-in terminal
            (CryptArt Commander), peer-to-peer resource sharing (DonatePersonalSeconds),
            a custom installer creator (Clone Tool), and a settings hub. The Service
            integrates with third-party APIs and services that you configure using your
            own credentials and API keys. The Service is provided on an "as is" basis and
            may be modified, updated, or discontinued at any time without notice.
          </p>

          <h2 className="text-lg font-bold mt-8 mb-3">4. User Responsibilities</h2>
          <ul className="list-disc pl-6 text-sm leading-relaxed mb-4 flex flex-col gap-1">
            <li>You are responsible for maintaining the confidentiality of your API keys and credentials.</li>
            <li>You are responsible for all activity that occurs under your API keys.</li>
            <li>You agree to use the Service in compliance with all applicable federal, state (including New Hampshire), and local laws and regulations.</li>
            <li>You will not use the Service for any unlawful purpose, including but not limited to creating illegal content, infringing intellectual property, or harassing others.</li>
            <li>You will not attempt to reverse engineer, decompile, or disassemble any proprietary components of the Service beyond what is permitted by applicable law.</li>
            <li>You will not use the Service to develop competing products or services without written consent.</li>
            <li>You will not use the Service to transmit viruses, malware, or other harmful code.</li>
            <li>You will not attempt to gain unauthorized access to any systems or networks connected to the Service.</li>
            <li>You will not use automated means (bots, scrapers, etc.) to access the Service except as expressly permitted.</li>
            <li>You will not misrepresent your identity or impersonate any person or entity.</li>
          </ul>

          <h2 className="text-lg font-bold mt-8 mb-3">5. Third-Party Services and API Keys</h2>
          <p className="text-sm leading-relaxed mb-4">
            The Service allows you to connect to third-party services including, but not limited to:
          </p>
          <ul className="list-disc pl-6 text-sm leading-relaxed mb-4 flex flex-col gap-1">
            <li><strong>OpenAI API</strong> - for AI chat, image generation, and text-to-speech</li>
            <li><strong>OpenRouter</strong> - for multi-model AI access (200+ models from OpenAI, Anthropic, Google, Meta, Mistral, and more)</li>
            <li><strong>ElevenLabs API</strong> - for text-to-speech, speech-to-text, and sound effect generation</li>
            <li><strong>Pexels API</strong> - for stock media search and import</li>
            <li><strong>Supabase/GiveGigs</strong> - for media storage and management</li>
            <li><strong>Cloudflare</strong> - for security, performance, and bot detection (Turnstile)</li>
          </ul>
          <p className="text-sm leading-relaxed mb-4">
            Your use of these third-party services is subject to their respective terms of service
            and privacy policies. We are not responsible for the availability, accuracy, content,
            or security of third-party services. Any fees charged by third-party services (e.g.,
            OpenAI API usage costs, ElevenLabs subscription fees) are your sole responsibility.
            We make no representations or warranties regarding third-party services.
          </p>

          <h2 className="text-lg font-bold mt-8 mb-3">6. Intellectual Property and Licensing</h2>
          <p className="text-sm leading-relaxed mb-4">
            The CryptArtist Studio application, including its source code, design, logos
            ({"\u{1F480}\u{1F3A8}"}), branding, and documentation, is the intellectual property
            of MattyJacks and is released under the <strong>CryptArtist Custom License
            v1.69.420.3</strong>. Content you create using the Service belongs to you, subject
            to the terms of any third-party services used in its creation (e.g., OpenAI's usage
            policies for AI-generated content). You may not claim ownership of the CryptArtist
            Studio software itself, its branding, or its documentation.
          </p>

          <h2 className="text-lg font-bold mt-8 mb-3">7. AI-Generated Content Disclaimer</h2>
          <p className="text-sm leading-relaxed mb-4">
            The Service integrates artificial intelligence features that generate text, code,
            images, audio, and other content. You acknowledge and agree that:
          </p>
          <ul className="list-disc pl-6 text-sm leading-relaxed mb-4 flex flex-col gap-1">
            <li>AI-generated content may be inaccurate, incomplete, biased, or inappropriate.</li>
            <li>You are solely responsible for reviewing, verifying, and approving all AI-generated content before use.</li>
            <li>The Operator makes no warranties regarding the accuracy, quality, legality, or fitness of AI-generated content for any purpose.</li>
            <li>The Operator is not liable for any damages, losses, claims, or liabilities arising from your use of or reliance on AI-generated content.</li>
            <li>AI-generated code may contain bugs, security vulnerabilities, or errors. You are solely responsible for testing and validating any code before deployment.</li>
            <li>AI-generated images, audio, and media may inadvertently resemble copyrighted or trademarked material. You are responsible for ensuring compliance with applicable intellectual property laws.</li>
            <li>The Operator does not guarantee that AI-generated content is free from intellectual property claims.</li>
          </ul>

          <h2 className="text-lg font-bold mt-8 mb-3">8. Video Game Cloner - Special Terms</h2>
          <p className="text-sm leading-relaxed mb-4">
            The GameStudio program includes a "Video Game Cloner" feature that generates
            original video games inspired by the <em>mechanics</em> (not lore, art, characters,
            or copyrighted/patented content) of existing video games. By using this feature:
          </p>
          <ul className="list-disc pl-6 text-sm leading-relaxed mb-4 flex flex-col gap-1">
            <li>The Video Game Cloner is designed and optimized for games in the <strong>public domain</strong>.</li>
            <li>The tool can accept any game name, but generates only original content based on publicly available mechanical descriptions.</li>
            <li><strong>No copyrighted or patented content</strong> is intentionally included in generated output.</li>
            <li>Patent holders and copyright owners may use this tool on their own intellectual property without restriction.</li>
            <li><strong>You are solely responsible</strong> for the games you produce using this tool.</li>
            <li>The Operator is <strong>not liable</strong> for any games generated by this tool, including any claims of copyright infringement, patent infringement, or trademark violation.</li>
            <li>The Operator <strong>will actively report copyright infringement</strong> at our sole discretion to protect the platform and its community.</li>
            <li>You represent and warrant that you will not use this tool to intentionally infringe on any third party's intellectual property rights.</li>
            <li>You agree to indemnify the Operator against any and all claims arising from games you produce using this tool.</li>
          </ul>

          <h2 className="text-lg font-bold mt-8 mb-3">9. Donations</h2>
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
            <li>Donations are not tax-deductible as MattyJacks is not a registered 501(c)(3) nonprofit.</li>
            <li>Donation amounts and donor information are kept confidential unless the donor opts into public recognition.</li>
          </ul>

          <h2 className="text-lg font-bold mt-8 mb-3">10. Peer-to-Peer Resource Sharing (DonatePersonalSeconds)</h2>
          <p className="text-sm leading-relaxed mb-4">
            The DonatePersonalSeconds feature enables voluntary peer-to-peer sharing of compute
            resources (CPU, RAM, GPU). By using this feature:
          </p>
          <ul className="list-disc pl-6 text-sm leading-relaxed mb-4 flex flex-col gap-1">
            <li>You voluntarily donate idle computing resources to the network.</li>
            <li>All peer connections use cryptographically secure identifiers and password verification.</li>
            <li>You may set limits on the percentage of CPU, RAM, and GPU resources shared.</li>
            <li>You may stop donating or borrowing resources at any time.</li>
            <li>We are not responsible for any hardware wear, electricity costs, performance degradation, or data loss resulting from resource sharing.</li>
            <li>You agree not to use borrowed resources for any unlawful purpose.</li>
            <li>You assume all risk associated with peer-to-peer connections and resource sharing.</li>
            <li>The Operator is not responsible for the actions or content of other peers on the network.</li>
          </ul>

          <h2 className="text-lg font-bold mt-8 mb-3">11. Security</h2>
          <p className="text-sm leading-relaxed mb-4">
            CryptArtist Studio has undergone comprehensive security hardening with 300
            vulnerability fixes. While we strive to maintain the highest security standards,
            <strong> no software is perfectly secure</strong>. You acknowledge that:
          </p>
          <ul className="list-disc pl-6 text-sm leading-relaxed mb-4 flex flex-col gap-1">
            <li>The Service may contain undiscovered vulnerabilities.</li>
            <li>You use the Service at your own risk.</li>
            <li>The Operator is not liable for any security breaches, data loss, or unauthorized access to your data or systems.</li>
            <li>You are responsible for implementing appropriate security measures on your own systems.</li>
            <li>You should not store highly sensitive information (passwords, financial data) in the Service beyond API keys stored locally.</li>
          </ul>

          <h2 className="text-lg font-bold mt-8 mb-3">12. Disclaimer of Warranties</h2>
          <p className="text-sm leading-relaxed mb-4 uppercase font-semibold">
            THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND,
            EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF
            MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT.
            THE OPERATOR DOES NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE,
            SECURE, OR FREE OF VIRUSES OR OTHER HARMFUL COMPONENTS. THE OPERATOR MAKES NO
            WARRANTIES REGARDING THE ACCURACY, RELIABILITY, OR COMPLETENESS OF ANY CONTENT,
            INCLUDING AI-GENERATED CONTENT. THE OPERATOR DOES NOT WARRANT THAT THE SERVICE
            WILL MEET YOUR REQUIREMENTS OR EXPECTATIONS. NO ADVICE OR INFORMATION, WHETHER
            ORAL OR WRITTEN, OBTAINED FROM THE OPERATOR SHALL CREATE ANY WARRANTY NOT EXPRESSLY
            STATED IN THESE TERMS.
          </p>

          <h2 className="text-lg font-bold mt-8 mb-3">13. Limitation of Liability</h2>
          <p className="text-sm leading-relaxed mb-4 uppercase font-semibold">
            TO THE MAXIMUM EXTENT PERMITTED BY NEW HAMPSHIRE LAW AND APPLICABLE FEDERAL LAW,
            IN NO EVENT SHALL MATTYJACKS (THE SOLE PROPRIETOR), ITS OWNER, CONTRIBUTORS,
            AFFILIATES, OR ANY PERSON ASSOCIATED WITH THE SERVICE BE LIABLE FOR ANY DIRECT,
            INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES,
            OR ANY LOSS OF PROFITS, REVENUE, DATA, USE, GOODWILL, BUSINESS OPPORTUNITY, OR
            OTHER INTANGIBLE LOSSES, ARISING OUT OF OR IN CONNECTION WITH: (A) YOUR USE OF
            OR INABILITY TO USE THE SERVICE; (B) ANY CONTENT GENERATED BY OR THROUGH THE
            SERVICE, INCLUDING AI-GENERATED CONTENT; (C) UNAUTHORIZED ACCESS TO OR ALTERATION
            OF YOUR DATA OR TRANSMISSIONS; (D) STATEMENTS OR CONDUCT OF ANY THIRD PARTY ON
            THE SERVICE; (E) PEER-TO-PEER RESOURCE SHARING; (F) GAMES CREATED USING THE
            VIDEO GAME CLONER; OR (G) ANY OTHER MATTER RELATING TO THE SERVICE, EVEN IF THE
            OPERATOR HAS BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES. IN NO EVENT SHALL
            THE OPERATOR'S TOTAL LIABILITY EXCEED THE AMOUNT YOU HAVE PAID TO THE OPERATOR
            IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM, OR FIFTY DOLLARS ($50.00),
            WHICHEVER IS LESS.
          </p>

          <h2 className="text-lg font-bold mt-8 mb-3">14. Assumption of Risk</h2>
          <p className="text-sm leading-relaxed mb-4">
            You expressly acknowledge and agree that your use of the Service is at your sole risk.
            You assume full responsibility for any and all risks associated with using the Service,
            including but not limited to: data loss, hardware damage, software conflicts, security
            breaches, financial losses from third-party API usage, intellectual property disputes
            arising from AI-generated content, and any consequences of peer-to-peer resource sharing.
          </p>

          <h2 className="text-lg font-bold mt-8 mb-3">15. Indemnification</h2>
          <p className="text-sm leading-relaxed mb-4">
            You agree to indemnify, defend, and hold harmless MattyJacks (the sole proprietor)
            and any associated persons, contributors, and affiliates from and against any and all
            claims, liabilities, damages, losses, costs, and expenses (including reasonable
            attorneys' fees and court costs) arising out of or in any way connected with:
            (a) your use of the Service; (b) your violation of these Terms; (c) your violation
            of any third-party rights, including intellectual property rights; (d) content you
            create, generate, or distribute using the Service; (e) games created using the
            Video Game Cloner; (f) your use of AI-generated content; (g) your participation in
            peer-to-peer resource sharing; or (h) any claim that your use of the Service caused
            damage to a third party. This indemnification obligation survives termination of
            these Terms and your use of the Service.
          </p>

          <h2 className="text-lg font-bold mt-8 mb-3">16. Dispute Resolution and Arbitration</h2>
          <p className="text-sm leading-relaxed mb-4">
            <strong>PLEASE READ THIS SECTION CAREFULLY. IT AFFECTS YOUR LEGAL RIGHTS.</strong>
          </p>
          <ul className="list-disc pl-6 text-sm leading-relaxed mb-4 flex flex-col gap-1">
            <li><strong>Informal Resolution First:</strong> Before filing any formal dispute, you agree to contact us at Matt@MattyJacks.com and attempt to resolve the dispute informally for at least thirty (30) days.</li>
            <li><strong>Binding Arbitration:</strong> If informal resolution fails, any dispute, claim, or controversy arising out of or relating to these Terms or the Service shall be resolved by binding arbitration administered in accordance with the rules of the American Arbitration Association (AAA), conducted in the State of New Hampshire. The arbitrator's decision shall be final and binding.</li>
            <li><strong>Small Claims Exception:</strong> Either party may bring an individual action in small claims court in New Hampshire if the claim qualifies.</li>
            <li><strong>No Class Actions:</strong> YOU AGREE THAT ANY DISPUTE RESOLUTION PROCEEDINGS WILL BE CONDUCTED ONLY ON AN INDIVIDUAL BASIS AND NOT IN A CLASS, CONSOLIDATED, OR REPRESENTATIVE ACTION. You waive any right to participate in a class action lawsuit or class-wide arbitration against the Operator.</li>
            <li><strong>Waiver of Jury Trial:</strong> TO THE FULLEST EXTENT PERMITTED BY LAW, YOU AND THE OPERATOR EACH WAIVE THE RIGHT TO A JURY TRIAL FOR ANY DISPUTE ARISING OUT OF OR RELATED TO THESE TERMS OR THE SERVICE.</li>
          </ul>

          <h2 className="text-lg font-bold mt-8 mb-3">17. Governing Law and Jurisdiction</h2>
          <p className="text-sm leading-relaxed mb-4">
            These Terms shall be governed by and construed in accordance with the laws of the
            State of New Hampshire, United States, without regard to its conflict of law provisions.
            For any matters not subject to arbitration, any legal action or proceeding arising under
            these Terms shall be brought exclusively in the state or federal courts located in
            New Hampshire, and the parties hereby consent to personal jurisdiction and venue therein.
          </p>

          <h2 className="text-lg font-bold mt-8 mb-3">18. DMCA and Copyright Complaints</h2>
          <p className="text-sm leading-relaxed mb-4">
            If you believe that content available through the Service infringes your copyright,
            you may submit a DMCA takedown notice to our designated agent:
          </p>
          <ul className="list-disc pl-6 text-sm leading-relaxed mb-4 flex flex-col gap-1">
            <li><strong>DMCA Agent:</strong> Matt, MattyJacks</li>
            <li><strong>Email:</strong> <a href="mailto:Matt@MattyJacks.com" className="text-studio-cyan hover:underline">Matt@MattyJacks.com</a></li>
            <li><strong>Address:</strong> New Hampshire, USA</li>
          </ul>
          <p className="text-sm leading-relaxed mb-4">
            Your notice must include: identification of the copyrighted work, identification of
            the infringing material, your contact information, a statement of good faith belief,
            a statement of accuracy under penalty of perjury, and your physical or electronic
            signature. We will respond to valid DMCA notices in accordance with applicable law.
          </p>

          <h2 className="text-lg font-bold mt-8 mb-3">19. Export Compliance</h2>
          <p className="text-sm leading-relaxed mb-4">
            You agree to comply with all applicable export and re-export control laws and
            regulations, including the Export Administration Regulations (EAR) maintained by the
            U.S. Department of Commerce, trade and economic sanctions maintained by OFAC, and the
            International Traffic in Arms Regulations (ITAR) maintained by the Department of State.
            You represent that you are not located in, or a resident or national of, any country
            subject to U.S. government embargo, and that you are not on any U.S. government
            restricted party list.
          </p>

          <h2 className="text-lg font-bold mt-8 mb-3">20. Termination</h2>
          <p className="text-sm leading-relaxed mb-4">
            We reserve the right to terminate or suspend your access to the Service at any time,
            with or without cause, with or without notice. Upon termination, your right to use the
            Service will immediately cease. All provisions of these Terms that by their nature
            should survive termination shall survive, including but not limited to: intellectual
            property provisions, warranty disclaimers, indemnification, limitation of liability,
            dispute resolution, and governing law provisions.
          </p>

          <h2 className="text-lg font-bold mt-8 mb-3">21. Force Majeure</h2>
          <p className="text-sm leading-relaxed mb-4">
            The Operator shall not be liable for any failure or delay in performing obligations
            under these Terms due to causes beyond reasonable control, including but not limited to:
            acts of God, natural disasters, war, terrorism, riots, embargoes, acts of civil or
            military authorities, fire, floods, epidemics, pandemics, strikes, power outages,
            internet service provider failures, or cyberattacks.
          </p>

          <h2 className="text-lg font-bold mt-8 mb-3">22. Electronic Communications Consent</h2>
          <p className="text-sm leading-relaxed mb-4">
            By using the Service, you consent to receive electronic communications from us.
            You agree that all agreements, notices, disclosures, and other communications we
            provide electronically satisfy any legal requirement that such communications be
            in writing.
          </p>

          <h2 className="text-lg font-bold mt-8 mb-3">23. No Agency or Partnership</h2>
          <p className="text-sm leading-relaxed mb-4">
            Nothing in these Terms creates or is intended to create an agency, partnership,
            joint venture, employer-employee, or franchisor-franchisee relationship between
            you and the Operator.
          </p>

          <h2 className="text-lg font-bold mt-8 mb-3">24. Assignment</h2>
          <p className="text-sm leading-relaxed mb-4">
            You may not assign or transfer your rights or obligations under these Terms without
            the Operator's prior written consent. The Operator may freely assign these Terms
            and its rights and obligations hereunder without restriction.
          </p>

          <h2 className="text-lg font-bold mt-8 mb-3">25. Severability</h2>
          <p className="text-sm leading-relaxed mb-4">
            If any provision of these Terms is found to be unenforceable or invalid under
            New Hampshire law or any applicable law, that provision shall be modified to reflect
            the parties' original intent as nearly as possible in an enforceable manner, and the
            remaining provisions shall continue in full force and effect. The invalidity of any
            provision shall not affect the validity of any other provision.
          </p>

          <h2 className="text-lg font-bold mt-8 mb-3">26. Waiver</h2>
          <p className="text-sm leading-relaxed mb-4">
            The failure of the Operator to enforce any right or provision of these Terms shall
            not constitute a waiver of such right or provision. Any waiver of any provision of
            these Terms will be effective only if in writing and signed by the Operator.
          </p>

          <h2 className="text-lg font-bold mt-8 mb-3">27. Entire Agreement</h2>
          <p className="text-sm leading-relaxed mb-4">
            These Terms, together with the Privacy Policy and the CryptArtist Custom License
            v1.69.420.3, constitute the entire agreement between you and the Operator regarding
            your use of the Service, and supersede all prior agreements, understandings,
            representations, and warranties, both written and oral.
          </p>

          <h2 className="text-lg font-bold mt-8 mb-3">28. Changes to These Terms</h2>
          <p className="text-sm leading-relaxed mb-4">
            We may update these Terms from time to time at our sole discretion. Changes will be
            effective when posted. Material changes will be indicated by updating the "Last updated"
            date at the top of this page. Your continued use of the Service after any changes
            constitutes acceptance of the updated Terms. We encourage you to review this page
            periodically. If you do not agree to the modified Terms, you must discontinue use
            of the Service.
          </p>

          <h2 className="text-lg font-bold mt-8 mb-3">29. Contact Us</h2>
          <p className="text-sm leading-relaxed mb-4">
            If you have questions about these Terms, please contact the Operator:
          </p>
          <ul className="list-disc pl-6 text-sm leading-relaxed mb-4 flex flex-col gap-1">
            <li><strong>Operator:</strong> MattyJacks (Sole Proprietorship)</li>
            <li><strong>Location:</strong> New Hampshire, United States</li>
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
      <footer className="status-bar" role="status" aria-live="polite">
        <span>{"\u{1F480}\u{1F3A8}"} CryptArtist Studio</span>
        <span className="text-studio-muted">Terms of Use</span>
      </footer>
    </div>
  );
}
