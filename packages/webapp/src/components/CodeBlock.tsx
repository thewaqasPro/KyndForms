import { IconCheck, IconCopy } from '@tabler/icons-react'
import { FC, useMemo, useState } from 'react'

import { cn } from '@/utils'

interface CodeBlockProps {
  code: string
  language?: 'html' | 'javascript' | 'astro' | 'curl' | 'embed' | string
  title?: string
  className?: string
  maxHeight?: string
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function highlightCode(rawCode: string, language: string = 'html'): string {
  const tokens: string[] = []
  function saveToken(content: string, cls: string) {
    const idx = tokens.length
    tokens.push(`<span class="${cls}">${content}</span>`)
    return `__KYND_TOKEN_${idx}__`
  }

  let text = escapeHtml(rawCode)

  if (language === 'html' || language === 'embed' || language === 'astro') {
    // 1. Strings
    text = text.replace(/"[^"]*"|'[^']*'/g, m => saveToken(m, 'text-emerald-400 font-normal'))
    // 2. HTML comments
    text = text.replace(/&lt;!--[\s\S]*?--&gt;/g, m => saveToken(m, 'text-slate-500 italic'))
    // 3. Tags (opening and closing)
    text = text.replace(/&lt;\/?[\w-]+/g, m => saveToken(m, 'text-rose-400 font-semibold'))
    text = text.replace(/\/&gt;|&gt;/g, m => saveToken(m, 'text-rose-400 font-semibold'))
    // 4. Attributes
    text = text.replace(/\b([\w:-]+)(?==)/g, m => saveToken(m, 'text-amber-300'))
  } else if (language === 'javascript' || language === 'typescript' || language === 'nextjs') {
    // 1. Strings
    text = text.replace(/"[^"]*"|'[^']*'|`[^`]*`/g, m =>
      saveToken(m, 'text-emerald-400 font-normal')
    )
    // 2. Comments
    text = text.replace(/\/\/[^\n]*/g, m => saveToken(m, 'text-slate-500 italic'))
    text = text.replace(/&lt;!--[\s\S]*?--&gt;/g, m => saveToken(m, 'text-slate-500 italic'))
    // 3. Keywords
    text = text.replace(
      /\b(import|export|default|function|const|let|var|return|async|await|try|catch|if|else|typeof|new|from|as)\b/g,
      m => saveToken(m, 'text-purple-400 font-medium')
    )
    text = text.replace(/\b(true|false|null|undefined)\b/g, m => saveToken(m, 'text-amber-400'))
    text = text.replace(
      /\b(React|useState|useEffect|FormData|URLSearchParams|HTMLFormElement|Object|JSON)\b/g,
      m => saveToken(m, 'text-cyan-400')
    )
    // 4. JSX tags
    text = text.replace(/&lt;\/?[\w-]+/g, m => saveToken(m, 'text-rose-400 font-semibold'))
    text = text.replace(/\/&gt;|&gt;/g, m => saveToken(m, 'text-rose-400 font-semibold'))
  } else if (language === 'curl' || language === 'bash' || language === 'sh') {
    // 1. Strings
    text = text.replace(/"[^"]*"|'[^']*'/g, m => saveToken(m, 'text-emerald-400 font-normal'))
    // 2. Comments
    text = text.replace(/#[^\n]*/g, m => saveToken(m, 'text-slate-500 italic'))
    // 3. Command
    text = text.replace(/\b(curl)\b/g, m => saveToken(m, 'text-orange-400 font-bold'))
    // 4. Flags
    text = text.replace(/(-[a-zA-Z0-9]+|--[a-zA-Z0-9-]+)/g, m =>
      saveToken(m, 'text-sky-400 font-medium')
    )
  }

  // Restore tokens in reverse
  for (let i = tokens.length - 1; i >= 0; i--) {
    text = text.replace(`__KYND_TOKEN_${i}__`, tokens[i])
  }

  return text
}

export const CodeBlock: FC<CodeBlockProps> = ({
  code,
  language = 'html',
  title,
  className,
  maxHeight = '420px'
}) => {
  const [copied, setCopied] = useState(false)

  const highlightedHtml = useMemo(() => {
    return highlightCode(code, language.toLowerCase())
  }, [code, language])

  function handleCopy() {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const langLabel = useMemo(() => {
    switch (language.toLowerCase()) {
      case 'nextjs':
      case 'javascript':
      case 'typescript':
        return 'React / Next.js'
      case 'astro':
        return 'Astro.js'
      case 'curl':
      case 'bash':
        return 'cURL'
      case 'embed':
        return 'HTML / Embed'
      default:
        return language.toUpperCase()
    }
  }, [language])

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl border border-slate-800 bg-[#0c1017] text-slate-100 shadow-lg shadow-black/20',
        className
      )}
    >
      {/* Code Header Bar */}
      <div className="flex items-center justify-between border-b border-slate-800/80 bg-slate-900/60 px-4 py-2 text-xs">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
          </div>
          <span className="ml-2 font-mono text-[11px] font-medium text-slate-400">
            {title || langLabel}
          </span>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
        >
          {copied ? (
            <>
              <IconCheck className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-emerald-400">Copied!</span>
            </>
          ) : (
            <>
              <IconCopy className="h-3.5 w-3.5 text-slate-400" />
              <span>Copy code</span>
            </>
          )}
        </button>
      </div>

      {/* Code Content */}
      <pre
        className="scrollbar overflow-x-auto p-4 font-mono text-xs/6 text-slate-200"
        style={{ maxHeight }}
      >
        <code dangerouslySetInnerHTML={{ __html: highlightedHtml }} />
      </pre>
    </div>
  )
}
