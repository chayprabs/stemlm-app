# Privacy Policy

**Last updated: 28 September 2026**

> This is a Markdown copy of the privacy policy published at [stemlm.app/privacy/](https://stemlm.app/privacy/). If the two ever differ, the website version applies.

> **v2.0.0 build information:** The GitHub v2.0.0 extension disables analytics, ships no telemetry endpoint or credential, and has no analytics toggle. IBM Plex and KaTeX fonts are bundled locally. The policy below also describes other releases; these build facts do not change how your chosen AI provider handles chat content or attachments.

How the stemLM extension and website handle study content, local storage, usage analytics and your privacy choices.

## At a glance

- **No stemLM account.** No stemLM login, subscription or payment details.
- **Local study content.** The extension processes and saves study content in your browser. Your AI provider handles the chat itself.
- **Analytics you control.** The extension uses PostHog for usage analytics. You can turn it off in Settings. This website has no analytics.

## Contents

1. [Who we are and what this covers](#1-who-we-are-and-what-this-covers)
2. [The short version](#2-the-short-version)
3. [What the extension reads](#3-what-the-extension-reads)
4. [What your AI provider receives](#4-what-your-ai-provider-receives)
5. [What stays on your device](#5-what-stays-on-your-device)
6. [Browser access and permissions](#6-browser-access-and-permissions)
7. [PostHog usage analytics](#7-posthog-usage-analytics)
8. [Other network requests](#8-other-network-requests)
9. [Website data and local storage](#9-website-data-and-local-storage)
10. [Support and correspondence](#10-support-and-correspondence)
11. [Who receives information](#11-who-receives-information)
12. [Retention and deletion](#12-retention-and-deletion)
13. [Processing outside India](#13-processing-outside-india)
14. [Chrome Web Store user data](#14-chrome-web-store-user-data)
15. [Age and younger users](#15-age-and-younger-users)
16. [Your choices and privacy rights](#16-your-choices-and-privacy-rights)
17. [Security](#17-security)
18. [Updates to this policy](#18-updates-to-this-policy)

## 1. Who we are and what this covers

stemLM is an independent, unincorporated project operated from India by Chaitanya Prabuddha, Rohit Gupta and Abhishek Dogra (“stemLM”, “we”, “us”). The founders are responsible for the information we handle as described in this policy. This policy covers the stemLM browser extension and the website at https://stemlm.app.

For privacy questions, requests or complaints, contact [founders@stemlm.app](mailto:founders@stemlm.app). This is a privacy notice, not a request for blanket consent to collect information. Your AI provider's own privacy policy applies to information you give that provider.

## 2. The short version

- stemLM has no user accounts or paid plans.
- The extension reads the question and AI response on supported chat pages to build your study view locally. We do not operate a server that receives your questions, answers or saved solutions from the extension.
- Claude, Gemini, Grok and ChatGPT handle the chats you have with them under their own policies.
- Saved questions and preferences are kept in your browser. Exported PDFs are files on your computer.
- The extension uses PostHog for usage analytics, with an analytics control in Settings. This website has no analytics or advertising scripts.
- We do not sell or rent personal data or use your study content for advertising or to train AI models.
- If you email us, we receive the information you choose to send.

## 3. What the extension reads

On a supported chat page, stemLM reads the question, the AI response and the page elements needed for its controls. It turns structured responses into steps, formulas, diagrams, takeaways and quick checks. Selecting text or asking a follow-up can also use the selected text and relevant study context. This processing happens in your browser.

The extension operates on Claude (claude.ai), Gemini (gemini.google.com), Grok (grok.com) and ChatGPT (chatgpt.com or chat.openai.com). It inspects tab addresses to find the relevant supported chat. Its study features do not collect a browsing-history profile, read page content from unrelated websites, or access your AI account's authentication cookies or passwords. If you paste sensitive information into a chat, that information is part of the chat content the panel can process.

## 4. What your AI provider receives

Pressing the orange stemLM **+** prepares answer-format instructions in your chat. The extension can attach a stemLM instruction text file and add a short instruction beneath your question. If attachment is unavailable, it can put the instructions directly in the composer. **Ask in chat** and follow-up controls can prepare relevant question, answer or selected-text context there too.

**stemLM does not press Send for you.** Review the prepared message before sending it. Your chat provider may upload attachments, save drafts or otherwise process composer content before you press Send; its own website controls that behavior.

Your provider receives whatever you submit through its website, including your question, attached images or documents and the stemLM instructions. Anthropic operates Claude, Google operates Gemini, xAI operates Grok and OpenAI operates ChatGPT. Their own terms, retention, training settings and privacy choices apply. We cannot delete their copy of a conversation or control their use of it.

## 5. What stays on your device

The extension uses browser extension storage for study features. These records are separate from the conversation your AI provider keeps.

| Record | Purpose | Retention |
| --- | --- | --- |
| Preferences | Remember settings such as on/off, theme, text size and panel layout. | Until changed, extension data is cleared, or stemLM is uninstalled. |
| Saved questions and solutions | Reopen, search and export the questions and structured answers you save, with associated subject, date and chat reference where recorded. | Until deleted, extension data is cleared or stemLM is uninstalled. Browser and library limits can prevent new saves; some releases may remove older saves when a limit is reached. |
| Last-chat reference | Return to the recent supported chat from the extension toolbar. | Until replaced, extension data is cleared or stemLM is uninstalled. |
| Open study workspace | Keep the current panel and tab state available during a browser session. | Session storage is cleared when the browser session ends; some state can be replaced earlier. |
| Analytics preferences and identifiers | Remember your analytics choice and associate usage events with an installation or browser rather than a stemLM account. | Clearing extension data or uninstalling removes local extension records. Previously sent analytics are separate. |

Extension windows may also keep local display preferences so they open in the chosen theme. Exported PDFs are ordinary files in your browser's download location or a location you choose. They remain until you delete them; uninstalling stemLM does not delete them.

Local storage is not a secure vault or a cloud backup. People with access to your device or browser profile may be able to read saved study content. Export anything important before clearing data or uninstalling.

## 6. Browser access and permissions

The Chrome Web Store listing and your browser's installation dialog show the permissions for the release you install. Permissions support these functions:

- **Supported chat sites:** place the stemLM controls on the page, prepare instructions and read the response needed for the study panel.
- **Extension storage:** keep preferences, saved work and workspace state. A release requesting **unlimitedStorage** can use a larger browser storage allowance; this does not create a cloud backup.
- **Tabs:** find or open the supported chat associated with your panel and open extension windows. This permission can give the extension access to tab metadata; we do not use it to collect a browsing-history profile.
- **Downloads:** save PDFs you ask to export.
- **Scripting, when requested:** run the extension's packaged integration code on supported chat pages.
- **Network access:** deliver usage analytics and any external resources used by the installed release, as described below.

## 7. PostHog usage analytics

**The extension uses PostHog for usage analytics. You can turn analytics off in the extension's Settings.** We use feature-usage information to understand which parts of stemLM are used and to improve reliability and the study experience. This website does not send analytics events.

Analytics records describe interactions with the extension and may be associated with an installation or device identifier. Such an identifier is **pseudonymous, not automatically anonymous**: events from the same installation can be linked even though there is no stemLM account. PostHog also receives the connection information necessary to receive a request, such as its source IP address.

Usage analytics is separate from study-content processing. We do not collect question text, AI answers, chat transcripts or saved solution content as usage analytics. “Local study content” does not mean that the extension never makes a network request.

Turning off analytics stops future usage analytics from that installation. It does not itself erase events already received by PostHog. If you want those records deleted, contact us before clearing local identifiers where possible, so we can help locate relevant records. Disabling or uninstalling the extension also stops its future requests.

PostHog's own handling of service data is described in its [privacy policy](https://posthog.com/privacy). That policy does not replace our responsibility for the analytics collected through stemLM.

## 8. Other network requests

Your chat provider's website makes its own requests when you use it. stemLM's study rendering and saved library operate locally; the extension does not upload them to a stemLM study backend.

Some extension releases load IBM Plex typefaces from Google Fonts (fonts.googleapis.com and fonts.gstatic.com), and PDF typesetting can request KaTeX fonts from jsDelivr (cdn.jsdelivr.net). Releases with bundled fonts can avoid those requests. Font requests do not intentionally include study content, but the receiving service receives ordinary connection information such as an IP address and request headers.

**External images and links:** an AI answer can contain a link or an externally hosted image. Displaying a remote image can contact its host, which receives the requested image address and ordinary connection information. A URL can itself contain information supplied by the AI. Following an external link gives the destination the information normally associated with that request. Treat those resources as third-party content.

Links to GitHub, the Chrome Web Store or other external sites take you to services with their own policies. Clicking an email link opens your chosen email service.

## 9. Website data and local storage

This website has no stemLM account, waitlist or newsletter signup. It sets no cookies and runs no analytics, advertising or third-party tracking scripts. It stores your light/dark theme choice in local storage. You can remove that choice by clearing this website's site data in your browser.

Fonts and images are served with the website. The interactive demonstration uses a pre-written sample in your browser and does not contact an AI service.

Delivering a website requires processing connection information. Our hosting infrastructure may process IP addresses, request times, requested pages, browser information and error or security logs to serve the site and prevent abuse. We do not use website delivery logs for advertising or visitor profiling.

## 10. Support and correspondence

When you email [founders@stemlm.app](mailto:founders@stemlm.app), we receive your email address, message and any attachments you choose to send. We use them to answer you, investigate a problem, handle a privacy request, or address a security or legal matter. We do not subscribe you to marketing emails.

If you include a question, screenshot or chat extract in an email, the founders can see it. Please send only what is needed and remove unrelated personal information. Our statement that the extension does not send study content to us does not cover content you choose to send separately. A public GitHub issue is also visible to other people; use email for private reports.

## 11. Who receives information

- **Your AI provider** receives chat content and attachments handled through its own website.
- **PostHog** processes extension analytics for us. The founders can access analytics available in the project.
- **Website hosting and email services** process connection information and correspondence needed to deliver those services.
- **Font and external image services** receive resource requests when external resources are displayed.
- **Legal or security recipients** may receive information we actually hold where disclosure is legally required or necessary to address fraud, abuse or a security issue, subject to applicable law.

We do not sell or rent personal information. The founders do not disclose your chat content or saved solutions for independent advertising, data-broker or model-training purposes. Your AI provider handles the material you send through its website under its own policies and training settings, as explained above. The founders do not obtain a copy of local study content merely because you use the extension.

## 12. Retention and deletion

Local-record retention is described in [What stays on your device](#5-what-stays-on-your-device). The provider's chat, an open study workspace and downloaded PDFs are separate records. Deleting a saved question removes its saved library entry; it does not also delete those other copies.

We retain personal analytics only for as long as needed to evaluate feature use and reliability, meet a legal obligation or resolve a relevant dispute. When it is no longer needed for those purposes, it must be deleted or irreversibly anonymised. PostHog's service plan and project settings determine the analytics available for queries; a query-retention window does not itself delete the underlying records.

Turning off analytics, clearing local data or uninstalling does not automatically remove previously received analytics. You can request deletion of personal analytics records as explained below.

We keep correspondence and service logs only for as long as needed for the support, security or legal purpose for which they were received. We may need to retain relevant records longer to comply with a legal obligation or resolve a dispute. Deletion may also need to account for a provider's backup and deletion process.

## 13. Processing outside India

We operate from India. Service providers, including analytics, hosting and email providers, may process information in other countries. Those countries may have different data protection rules. Any transfer requirements that apply to our handling of your personal information remain applicable.

This concerns information those services receive, such as analytics or correspondence. It does not mean stemLM uploads your saved library to an overseas study server. Your AI provider's own international processing is governed by its policies.

## 14. Chrome Web Store user data

stemLM's use of user information, including usage data, adheres to the [Chrome Web Store User Data Policy, including the Limited Use requirements](https://developer.chrome.com/docs/webstore/program-policies/limited-use/). We use extension data only to provide the disclosed study features and their related operation, reliability and improvement. We do not sell it, use it for personalised advertising, use it to assess creditworthiness or provide it for lending.

The extension does not transmit chat content or saved solutions for the founders to read. We restrict human review of extension user data to specific support material you explicitly permit us to read, security or legal needs, or aggregated and anonymised information for internal operations. A support message you deliberately send us is handled as correspondence. Browser permission prompts and this policy do not replace any additional disclosure or consent required for a particular collection practice.

## 15. Age and younger users

stemLM is a study tool for secondary-school, university and other learners. It is not directed at children under 13. You must also meet your AI provider's age rules and the requirements of local law; those may be stricter. A parent's permission does not override a provider's minimum age.

There is no stemLM account or age field. An analytics identifier does not tell us a person's age, so we cannot assume all analytics records relate to adults. Where applicable law requires a parent's consent or restricts tracking of children, those requirements apply.

If you are a parent or guardian and believe we have received personal information about a child without the required permission, contact [founders@stemlm.app](mailto:founders@stemlm.app). We will investigate and handle removal or other required action under applicable law.

## 16. Your choices and privacy rights

- **Analytics:** turn off usage analytics in the extension's Settings. Where processing depends on consent, you may withdraw it; withdrawal does not undo processing that was lawful before it.
- **Saved study content:** delete saved entries in the library, clear the extension's local data, or uninstall it. Clear any open workspace and delete downloaded files separately if you want those copies removed.
- **AI chats:** use the provider's own controls to manage or delete its copy of your conversations.
- **Website preference:** clear this website's site data to remove the theme choice.
- **Information we hold:** email us to make a privacy request or raise a complaint.

Depending on the law that applies to you and is in force, you may have rights to information, access, correction, deletion, portability, restriction, objection, withdrawal of consent or a complaint to a competent authority. India's data protection rights apply to the extent the relevant provisions are in force and applicable. This policy does not limit mandatory rights in India or elsewhere.

Send requests to [founders@stemlm.app](mailto:founders@stemlm.app). Describe the request and, if available, the extension version and analytics identifier associated with it. We may ask for only the information reasonably necessary to verify the request and locate relevant data. An email address alone may not identify pseudonymous analytics records. Do not send passwords or identity documents unless we explain why a lawful verification process needs them.

We will respond within the time required by applicable law and explain any lawful exception or identification limitation. We cannot retrieve local study records that were never sent to us, but can explain how to manage them on your device. You may contact the relevant authority without first resolving a complaint with us.

## 17. Security

Keeping study content in your browser reduces the information held outside your device. The extension uses packaged code under Chrome's Manifest V3 model and applies safeguards to structured content it displays. Its source is available on [GitHub](https://github.com/chayprabs/stemlm-app).

No software or device is perfectly secure. Protect your browser profile, keep the browser and extension updated, and avoid saving unnecessary sensitive information. Local study storage is not advertised as separately encrypted by stemLM. Report security concerns privately to [founders@stemlm.app](mailto:founders@stemlm.app) rather than posting sensitive information in a public issue.

## 18. Updates to this policy

We may update this policy when the product, data practices or legal requirements change. We will revise the date on this page and give appropriate notice before a material change takes effect, such as in the extension or its release notes. If an immediate change is required for legal or security reasons, we will explain it as soon as reasonably possible. We will seek separate consent where the law requires it. Continued use of stemLM is not automatically consent to a new processing purpose.

The [terms and conditions](TERMS.md) describe responsibilities and limits that apply when using stemLM.

---

Questions or a privacy request? Email [founders@stemlm.app](mailto:founders@stemlm.app). See also the [Terms and Conditions](TERMS.md).
