import type { JSX } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of service",
  description: "The agreement between Tyriaq and the people who use it.",
};

/**
 * Terms of service.
 *
 * Written to describe what Tyriaq actually does today rather than what a
 * template says a SaaS does. Every payment provider asks to read this
 * page before approving an account, and the first thing they check is
 * whether it matches the product — a document promising 99.9% uptime
 * from a service with no status page fails that check faster than no
 * document at all.
 *
 * Two blanks remain on purpose: the legal name and the jurisdiction.
 * Those are facts about a business, not something to invent.
 */
export default function TermsPage(): JSX.Element {
  return (
    <article>
      <h1 className="text-h1 text-text-primary">Terms of service</h1>
      <p className="mt-2 text-caption text-text-muted">Last updated 24 September 2026</p>

      <p>
        These terms cover your use of Tyriaq, a work management service for teams. By creating an
        account you agree to them. If you are agreeing on behalf of a company, you confirm you may
        bind that company.
      </p>

      <h2>1. The service</h2>
      <p>
        Tyriaq gives you workspaces, spaces, projects, tasks, documents and chat. We add and change
        features over time. If we remove something you depend on, we will tell the account owner by
        email before it goes.
      </p>

      <h2>2. Your account</h2>
      <ul>
        <li>You are responsible for what happens under your account, including keeping your password to yourself.</li>
        <li>You must be old enough to enter a contract where you live.</li>
        <li>One person, one account. Sharing a login between people makes our audit trail meaningless and makes support impossible.</li>
        <li>Tell us promptly if you believe somebody else has your credentials.</li>
      </ul>

      <h2>3. Your content is yours</h2>
      <p>
        Everything you put into Tyriaq — tasks, documents, files, messages — remains yours. You give
        us only the permission we need to run the service: to store it, back it up, display it to
        the people you have given access, and process it so the product works.
      </p>
      <p>
        We do not sell your content. We do not use it to train machine learning models. We do not
        read it except where you explicitly ask us to for support, or where we are legally required
        to.
      </p>

      <h2>4. What you may not do</h2>
      <ul>
        <li>Break the law, or help somebody else break it.</li>
        <li>Upload malware, or content you have no right to share.</li>
        <li>Attempt to access another customer&rsquo;s workspace, or probe our systems without written permission.</li>
        <li>Resell the service as your own.</li>
        <li>Send unsolicited bulk messages through invitations or space links.</li>
      </ul>
      <p>
        We may suspend an account that does these things. Where it is reasonable to do so first, we
        will warn you.
      </p>

      <h2>5. Plans and payment</h2>
      <p>
        The Free plan is free and limited — the limits are shown on the billing screen inside your
        workspace, and enforced. Paid plans are arranged directly with us: you tell us what you
        want, we agree payment with you, and we move your workspace onto that plan. There is no card
        on file, and nothing is charged automatically.
      </p>
      <p>
        When we add automated payments, we will publish the terms for them here before turning them
        on, and existing customers will be told by email.
      </p>
      <p>
        Prices may change. If a price changes for a plan you are on, we will tell you at least 30
        days beforehand, and it will not apply to a period you have already paid for.
      </p>

      <h2>6. Ending it</h2>
      <p>
        You can stop using Tyriaq at any time. Ask us and we will delete your workspace and
        everything in it. We may end an account for a serious breach of section 4, or with 30
        days&rsquo; notice for any reason — in which case you will be given the chance to export
        your data first.
      </p>

      <h2>7. Availability, honestly</h2>
      <p>
        We do not offer a service level agreement. Tyriaq runs on third-party infrastructure and
        will occasionally be unavailable, for maintenance or for reasons outside our control. We
        aim to keep it running and to be quick about it when it is not, and we will not pretend to a
        guarantee we cannot enforce.
      </p>
      <p>
        We keep backups, but you should keep your own copy of anything you cannot afford to lose.
      </p>

      <h2>8. Liability</h2>
      <p>
        Tyriaq is provided as it is. To the extent the law allows, we are not liable for indirect
        or consequential losses, lost profits, or lost data. Where liability cannot be excluded, it
        is limited to what you paid us in the twelve months before the claim — which, on a free
        account, is nothing.
      </p>

      <h2>9. Changes to these terms</h2>
      <p>
        We may update these terms. If a change matters to you — anything about your rights, your
        content or what you pay — we will email the account owner before it takes effect. Continuing
        to use Tyriaq afterwards means you accept the new version.
      </p>

      <h2>10. Contact and jurisdiction</h2>
      <p>
        Tyriaq is operated from Algeria. These terms are governed by Algerian law, and disputes
        belong to the courts of Algeria.
      </p>
      <p>
        Questions about these terms: <a href="mailto:aissahakim20@gmail.com">aissahakim20@gmail.com</a>.
      </p>

      <div className="mt-10 rounded-lg border border-dashed border-border-strong bg-surface-muted px-4 py-3">
        <p className="!mt-0 text-caption text-text-muted">
          <span className="font-medium text-text-secondary">Before selling to a company:</span> add
          your registered business name, commercial register number (RC) and address to sections 5
          and 10. A business customer&rsquo;s finance department will ask, and every payment
          provider checks.
        </p>
      </div>
    </article>
  );
}
