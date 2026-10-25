import { Dom, buildUrl, isMobile } from './utils'

import IconLoading from './assets/icon-loading.svg'
import { EmbedConfig, StandardSettings } from './type'

const STANDARD_TEMPLATE = `
<div class="kyndform__iframe-container">
  <iframe src="{src}" allow="microphone; camera"></iframe>
  <div class="kyndform__loading-container">${IconLoading}</div>
</div>
`

export class Standard<T extends StandardSettings> {
  protected readonly formId: string
  protected readonly containerId: string
  protected readonly $container: Dom
  protected readonly settings: EmbedConfig<T>['settings']
  protected readonly formUrl: string

  constructor(config: EmbedConfig<T>) {
    const { formId, type, container, settings, hiddenFields } = config

    let targetUrl = settings.customUrl
    if (!targetUrl) {
      targetUrl = `/form/${formId}`
    } else if (!targetUrl.includes(formId)) {
      targetUrl = `${targetUrl.replace(/\/+$/, '')}/form/${formId}`
    }

    this.formUrl = buildUrl(targetUrl, {
      ...settings,
      ...hiddenFields
    })

    container.addClass('kyndform__embed')
    container.addClass(`kyndform__embed-${type}`)

    this.formId = formId
    this.containerId = `kyndform__${type}-${formId}`
    this.$container = container
    this.settings = settings

    this.render()
  }

  protected render() {
    this.$container.style('width', `${this.settings.width}${this.settings.widthType}`)

    setTimeout(() => {
      let height = `${this.settings.height}${this.settings.heightType}`

      if (this.settings.autoResizeHeight) {
        const rect = this.$container.rect()

        height =
          (isMobile ? window.innerHeight : Math.min(window.innerHeight, rect.width * 0.6)) + 'px'
      }

      this.$container.style('height', height)
    }, 0)

    this.$container.append(
      Dom.compile(STANDARD_TEMPLATE, {
        src: this.formUrl
      })
    )

    this.$container.find('iframe').get(0).onload = () => {
      this.$container.find('.kyndform__loading-container').remove()
    }
  }
}
