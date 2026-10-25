import { IconCheck, IconCopy } from '@tabler/icons-react'
import { useMemo, useState } from 'react'

import { useParam } from '@/utils'

import { Button, CodeBlock, Modal, Tabs } from '@/components'
import { useModal, useWorkspaceStore } from '@/store'

export default function HeadlessModal() {
  const { formId } = useParam()
  const { sharingURLPrefix } = useWorkspaceStore()
  const { isOpen, onOpenChange } = useModal('HeadlessModal')

  const endpointUrl = useMemo(() => `${sharingURLPrefix}/f/${formId}`, [formId, sharingURLPrefix])

  const [copied, setCopied] = useState(false)

  function handleCopyEndpoint() {
    navigator.clipboard.writeText(endpointUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const htmlSnippet = useMemo(
    () => `<!-- Standard HTML Form -->
<form action="${endpointUrl}" method="POST">
  <!-- Core Form Fields -->
  <input type="text" name="name" placeholder="Your Name" required />
  <input type="email" name="email" placeholder="Your Email" required />
  <textarea name="message" placeholder="Your Message" required></textarea>

  <!-- Multi-select / Checkboxes (Interested In) -->
  <label><input type="checkbox" name="interested_in[]" value="Web Design" /> Web Design</label>
  <label><input type="checkbox" name="interested_in[]" value="SEO" /> SEO</label>

  <!-- Location or Custom Fields -->
  <input type="text" name="location" placeholder="City or Address" />

  <!-- Hidden Tracking / Attribution -->
  <input type="hidden" name="utm_source" value="google" />

  <!-- Honeypot Spam Protection (Keep Hidden from Users) -->
  <input type="text" name="_gotcha" style="display:none !important" tabIndex="-1" autocomplete="off" />

  <!-- Optional Custom Redirect After Submission -->
  <input type="hidden" name="_next" value="https://yourwebsite.com/thank-you" />

  <button type="submit">Submit</button>
</form>`,
    [endpointUrl]
  )

  const nextjsSnippet = useMemo(
    () => `'use client'

import { useState } from 'react'

export default function ContactForm() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus('loading')

    const formData = new FormData(e.currentTarget)
    const data = {
      name: formData.get('name'),
      email: formData.get('email'),
      message: formData.get('message'),
      interested_in: formData.getAll('interested_in'),
      location: formData.get('location'),
      utm_source: typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('utm_source') || 'website'
        : 'website'
    }

    try {
      const res = await fetch('${endpointUrl}', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(data)
      })

      if (res.ok) {
        setStatus('success')
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input name="name" type="text" placeholder="Name" required />
      <input name="email" type="email" placeholder="Email" required />
      <textarea name="message" placeholder="Message" required />

      {/* Spam Honeypot */}
      <input name="_gotcha" type="text" style={{ display: 'none' }} tabIndex={-1} autoComplete="off" />

      <button type="submit" disabled={status === 'loading'}>
        {status === 'loading' ? 'Sending...' : 'Send Message'}
      </button>

      {status === 'success' && <p>Thank you! Your message has been received.</p>}
      {status === 'error' && <p>Something went wrong. Please try again.</p>}
    </form>
  )
}`,
    [endpointUrl]
  )

  const astroSnippet = useMemo(
    () => `---
// src/components/ContactForm.astro
---

<form id="contact-form" action="${endpointUrl}" method="POST">
  <input type="text" name="name" placeholder="Name" required />
  <input type="email" name="email" placeholder="Email" required />
  <textarea name="message" placeholder="Message" required></textarea>

  <!-- Multi-select options -->
  <label><input type="checkbox" name="interested_in[]" value="Design" /> Design</label>
  <label><input type="checkbox" name="interested_in[]" value="Development" /> Development</label>

  <!-- Honeypot -->
  <input type="text" name="_gotcha" style="display:none" tabindex="-1" autocomplete="off" />
  <input type="hidden" name="_next" value="/thank-you" />

  <button type="submit">Submit</button>
</form>

<script>
  const form = document.getElementById('contact-form') as HTMLFormElement;
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);
    data.interested_in = formData.getAll('interested_in');

    const response = await fetch(form.action, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (response.ok) {
      window.location.href = '/thank-you';
    }
  });
</script>`,
    [endpointUrl]
  )

  const curlSnippet = useMemo(
    () => `curl -X POST ${endpointUrl} \\
  -H "Content-Type: application/json" \\
  -H "Accept: application/json" \\
  -d '{
    "name": "Sarah Connor",
    "email": "sarah@example.com",
    "interested_in": ["AI Defense", "Cybersecurity"],
    "location": { "city": "Los Angeles", "state": "CA" },
    "utm_source": "google_ads",
    "message": "Direct headless submission"
  }'`,
    [endpointUrl]
  )

  const tabs = [
    {
      value: 'html',
      label: 'HTML Form',
      content: (
        <div className="mt-4">
          <CodeBlock code={htmlSnippet} language="html" title="HTML Form Example" />
        </div>
      )
    },
    {
      value: 'nextjs',
      label: 'Next.js (React)',
      content: (
        <div className="mt-4">
          <CodeBlock
            code={nextjsSnippet}
            language="javascript"
            title="components/ContactForm.tsx"
          />
        </div>
      )
    },
    {
      value: 'astro',
      label: 'Astro.js',
      content: (
        <div className="mt-4">
          <CodeBlock code={astroSnippet} language="astro" title="components/ContactForm.astro" />
        </div>
      )
    },
    {
      value: 'curl',
      label: 'cURL / API',
      content: (
        <div className="mt-4">
          <CodeBlock code={curlSnippet} language="curl" title="Terminal cURL Request" />
        </div>
      )
    }
  ]

  return (
    <Modal.Simple
      open={isOpen}
      title="Headless & Static Form Endpoint"
      description="Connect your static website, Next.js, or Astro.js form directly by sending a POST request to this endpoint."
      contentProps={{
        className: 'max-w-3xl'
      }}
      onOpenChange={onOpenChange}
    >
      <div className="mt-6 space-y-6">
        <div>
          <label className="text-secondary text-xs font-semibold uppercase tracking-wider">
            Your Form Endpoint URL
          </label>
          <div className="hf-card border-input mt-2 flex items-center gap-x-3 rounded-lg border p-1 pl-3">
            <input
              type="text"
              readOnly
              value={endpointUrl}
              className="text-primary flex-1 bg-transparent font-mono text-sm outline-none"
            />
            <Button size="sm" onClick={handleCopyEndpoint}>
              {copied ? (
                <IconCheck className="h-4 w-4 text-green-500" />
              ) : (
                <IconCopy className="h-4 w-4" />
              )}
              <span>{copied ? 'Copied' : 'Copy URL'}</span>
            </Button>
          </div>
        </div>

        <div>
          <label className="text-secondary text-xs font-semibold uppercase tracking-wider">
            Integration Code Snippets
          </label>
          <div className="mt-2">
            <Tabs tabs={tabs} />
          </div>
        </div>

        <div className="border-accent-light bg-accent-light/10 text-secondary space-y-2 rounded-lg border p-4 text-xs">
          <div className="text-primary font-semibold">Special Form Attributes & Capabilities:</div>
          <ul className="list-disc space-y-1 pl-4">
            <li>
              <code className="text-primary font-mono">_next</code>: URL to redirect the browser to
              after submission.
            </li>
            <li>
              <code className="text-primary font-mono">_gotcha</code>: Honeypot spam trap. Keep
              hidden from real users.
            </li>
            <li>
              <code className="text-primary font-mono">interested_in[]</code>: Submitting arrays or
              multi-select inputs automatically formats as badge tags.
            </li>
            <li>
              <code className="text-primary font-mono">utm_*</code>: Tracking and referrer
              parameters are saved to hidden metadata.
            </li>
            <li>
              <code className="text-primary font-mono">enctype="multipart/form-data"</code>: File
              uploads via <code className="text-primary font-mono">&lt;input type="file"&gt;</code>{' '}
              are automatically stored in attachments.
            </li>
          </ul>
        </div>
      </div>
    </Modal.Simple>
  )
}
