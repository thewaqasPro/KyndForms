import { IconAlertTriangle, IconCheck, IconCopy, IconSparkles } from '@tabler/icons-react'
import { useMemo, useState } from 'react'

import { extractFormInputFields, generateAllSnippets } from './utils/snippet-generator'
import { useParam } from '@/utils'

import { Button, CodeBlock, Modal, Tabs } from '@/components'
import { useFormStore, useModal, useWorkspaceStore } from '@/store'

export default function HeadlessModal() {
  const { formId } = useParam()
  const { sharingURLPrefix } = useWorkspaceStore()
  const { form } = useFormStore()
  const { isOpen, onOpenChange } = useModal('HeadlessModal')

  const endpointUrl = useMemo(() => `${sharingURLPrefix}/f/${formId}`, [formId, sharingURLPrefix])

  const [copied, setCopied] = useState(false)

  function handleCopyEndpoint() {
    navigator.clipboard.writeText(endpointUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Extract input fields and hidden fields from active form
  const inputFields = useMemo(() => {
    const raw = form?.drafts || []
    return extractFormInputFields(raw as any)
  }, [form?.drafts])

  const hiddenFields = useMemo(() => {
    return form?.hiddenFields || []
  }, [form?.hiddenFields])

  const redirectUrl = useMemo(() => {
    return form?.settings?.redirectUrl
  }, [form?.settings?.redirectUrl])

  const snippets = useMemo(() => {
    return generateAllSnippets({
      endpointUrl,
      fields: inputFields,
      hiddenFields,
      redirectUrl
    })
  }, [endpointUrl, inputFields, hiddenFields, redirectUrl])

  const tabs = [
    {
      value: 'html',
      label: 'HTML Form',
      content: (
        <div className="mt-4">
          <CodeBlock code={snippets.html} language="html" title="HTML Form Example" />
        </div>
      )
    },
    {
      value: 'nextjs',
      label: 'Next.js (React)',
      content: (
        <div className="mt-4">
          <CodeBlock
            code={snippets.nextjs}
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
          <CodeBlock code={snippets.astro} language="astro" title="components/ContactForm.astro" />
        </div>
      )
    },
    {
      value: 'curl',
      label: 'cURL / API',
      content: (
        <div className="mt-4">
          <CodeBlock code={snippets.curl} language="curl" title="Terminal cURL Request" />
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
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="text-secondary text-xs font-semibold uppercase tracking-wider">
              Integration Code Snippets
            </label>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <IconSparkles className="h-3 w-3" />
                <span>
                  {inputFields.length}{' '}
                  {inputFields.length === 1 ? 'question field' : 'question fields'}
                </span>
              </span>
              {hiddenFields.length > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-medium text-blue-600 dark:text-blue-400">
                  <span>
                    {hiddenFields.length}{' '}
                    {hiddenFields.length === 1 ? 'hidden field' : 'hidden fields'}
                  </span>
                </span>
              )}
            </div>
          </div>

          {inputFields.length === 0 && (
            <div className="mt-3 flex items-start gap-3 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400">
              <IconAlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <span className="font-semibold">No questions configured yet:</span> These snippets
                show fallback sample fields. Add question blocks in the Form Builder to
                automatically generate your custom input fields and names here.
              </div>
            </div>
          )}

          <div className="mt-2">
            <Tabs tabs={tabs} />
          </div>
        </div>

        <div className="border-accent-light bg-accent-light/10 text-secondary space-y-2 rounded-lg border p-4 text-xs">
          <div className="text-primary font-semibold">Special Form Attributes & Capabilities:</div>
          <ul className="list-disc space-y-1 pl-4">
            <li>
              <code className="text-primary font-mono">_next</code>: URL to redirect the browser to
              after submission (defaults to your form redirect URL if configured in settings).
            </li>
            <li>
              <code className="text-primary font-mono">_gotcha</code>: Honeypot spam trap. Keep
              hidden from real users (bots filling this will be silently dropped).
            </li>
            <li>
              <code className="text-primary font-mono">field[]</code>: Submitting arrays or
              multi-select inputs automatically formats as badge tags or option arrays.
            </li>
            <li>
              <code className="text-primary font-mono">utm_* / hidden fields</code>: Configured
              hidden fields and URL tracking parameters are saved to submission metadata.
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
