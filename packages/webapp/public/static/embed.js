!(function (n, t) {
  'object' == typeof exports && 'undefined' != typeof module
    ? t(exports)
    : 'function' == typeof define && define.amd
      ? define(['exports'], t)
      : t(((n = 'undefined' != typeof globalThis ? globalThis : n || self).KyndForm = {}))
})(this, function (n) {
  'use strict'
  var t = function (n, e) {
    return (
      (t =
        Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array &&
          function (n, t) {
            n.__proto__ = t
          }) ||
        function (n, t) {
          for (var e in t) Object.prototype.hasOwnProperty.call(t, e) && (n[e] = t[e])
        }),
      t(n, e)
    )
  }
  function e(n, e) {
    if ('function' != typeof e && null !== e)
      throw new TypeError('Class extends value ' + String(e) + ' is not a constructor or null')
    function o() {
      this.constructor = n
    }
    ;(t(n, e),
      (n.prototype = null === e ? Object.create(e) : ((o.prototype = e.prototype), new o())))
  }
  var o = function () {
    return (
      (o =
        Object.assign ||
        function (n) {
          for (var t, e = 1, o = arguments.length; e < o; e++)
            for (var r in (t = arguments[e]))
              Object.prototype.hasOwnProperty.call(t, r) && (n[r] = t[r])
          return n
        }),
      o.apply(this, arguments)
    )
  }
  function r(n, t, e) {
    if (e || 2 === arguments.length)
      for (var o, r = 0, i = t.length; r < i; r++)
        (!o && r in t) || (o || (o = Array.prototype.slice.call(t, 0, r)), (o[r] = t[r]))
    return n.concat(o || Array.prototype.slice.call(t))
  }
  'function' == typeof SuppressedError && SuppressedError
  var i = {
      aliceblue: [240, 248, 255],
      antiquewhite: [250, 235, 215],
      aqua: [0, 255, 255],
      aquamarine: [127, 255, 212],
      azure: [240, 255, 255],
      beige: [245, 245, 220],
      bisque: [255, 228, 196],
      black: [0, 0, 0],
      blanchedalmond: [255, 235, 205],
      blue: [0, 0, 255],
      blueviolet: [138, 43, 226],
      brown: [165, 42, 42],
      burlywood: [222, 184, 135],
      cadetblue: [95, 158, 160],
      chartreuse: [127, 255, 0],
      chocolate: [210, 105, 30],
      coral: [255, 127, 80],
      cornflowerblue: [100, 149, 237],
      cornsilk: [255, 248, 220],
      crimson: [220, 20, 60],
      cyan: [0, 255, 255],
      darkblue: [0, 0, 139],
      darkcyan: [0, 139, 139],
      darkgoldenrod: [184, 134, 11],
      darkgray: [169, 169, 169],
      darkgreen: [0, 100, 0],
      darkgrey: [169, 169, 169],
      darkkhaki: [189, 183, 107],
      darkmagenta: [139, 0, 139],
      darkolivegreen: [85, 107, 47],
      darkorange: [255, 140, 0],
      darkorchid: [153, 50, 204],
      darkred: [139, 0, 0],
      darksalmon: [233, 150, 122],
      darkseagreen: [143, 188, 143],
      darkslateblue: [72, 61, 139],
      darkslategray: [47, 79, 79],
      darkslategrey: [47, 79, 79],
      darkturquoise: [0, 206, 209],
      darkviolet: [148, 0, 211],
      deeppink: [255, 20, 147],
      deepskyblue: [0, 191, 255],
      dimgray: [105, 105, 105],
      dimgrey: [105, 105, 105],
      dodgerblue: [30, 144, 255],
      firebrick: [178, 34, 34],
      floralwhite: [255, 250, 240],
      forestgreen: [34, 139, 34],
      fuchsia: [255, 0, 255],
      gainsboro: [220, 220, 220],
      ghostwhite: [248, 248, 255],
      gold: [255, 215, 0],
      goldenrod: [218, 165, 32],
      gray: [128, 128, 128],
      green: [0, 128, 0],
      greenyellow: [173, 255, 47],
      grey: [128, 128, 128],
      honeydew: [240, 255, 240],
      hotpink: [255, 105, 180],
      indianred: [205, 92, 92],
      indigo: [75, 0, 130],
      ivory: [255, 255, 240],
      khaki: [240, 230, 140],
      lavender: [230, 230, 250],
      lavenderblush: [255, 240, 245],
      lawngreen: [124, 252, 0],
      lemonchiffon: [255, 250, 205],
      lightblue: [173, 216, 230],
      lightcoral: [240, 128, 128],
      lightcyan: [224, 255, 255],
      lightgoldenrodyellow: [250, 250, 210],
      lightgray: [211, 211, 211],
      lightgreen: [144, 238, 144],
      lightgrey: [211, 211, 211],
      lightpink: [255, 182, 193],
      lightsalmon: [255, 160, 122],
      lightseagreen: [32, 178, 170],
      lightskyblue: [135, 206, 250],
      lightslategray: [119, 136, 153],
      lightslategrey: [119, 136, 153],
      lightsteelblue: [176, 196, 222],
      lightyellow: [255, 255, 224],
      lime: [0, 255, 0],
      limegreen: [50, 205, 50],
      linen: [250, 240, 230],
      magenta: [255, 0, 255],
      maroon: [128, 0, 0],
      mediumaquamarine: [102, 205, 170],
      mediumblue: [0, 0, 205],
      mediumorchid: [186, 85, 211],
      mediumpurple: [147, 112, 219],
      mediumseagreen: [60, 179, 113],
      mediumslateblue: [123, 104, 238],
      mediumspringgreen: [0, 250, 154],
      mediumturquoise: [72, 209, 204],
      mediumvioletred: [199, 21, 133],
      midnightblue: [25, 25, 112],
      mintcream: [245, 255, 250],
      mistyrose: [255, 228, 225],
      moccasin: [255, 228, 181],
      navajowhite: [255, 222, 173],
      navy: [0, 0, 128],
      oldlace: [253, 245, 230],
      olive: [128, 128, 0],
      olivedrab: [107, 142, 35],
      orange: [255, 165, 0],
      orangered: [255, 69, 0],
      orchid: [218, 112, 214],
      palegoldenrod: [238, 232, 170],
      palegreen: [152, 251, 152],
      paleturquoise: [175, 238, 238],
      palevioletred: [219, 112, 147],
      papayawhip: [255, 239, 213],
      peachpuff: [255, 218, 185],
      peru: [205, 133, 63],
      pink: [255, 192, 203],
      plum: [221, 160, 221],
      powderblue: [176, 224, 230],
      purple: [128, 0, 128],
      rebeccapurple: [102, 51, 153],
      red: [255, 0, 0],
      rosybrown: [188, 143, 143],
      royalblue: [65, 105, 225],
      saddlebrown: [139, 69, 19],
      salmon: [250, 128, 114],
      sandybrown: [244, 164, 96],
      seagreen: [46, 139, 87],
      seashell: [255, 245, 238],
      sienna: [160, 82, 45],
      silver: [192, 192, 192],
      skyblue: [135, 206, 235],
      slateblue: [106, 90, 205],
      slategray: [112, 128, 144],
      slategrey: [112, 128, 144],
      snow: [255, 250, 250],
      springgreen: [0, 255, 127],
      steelblue: [70, 130, 180],
      tan: [210, 180, 140],
      teal: [0, 128, 128],
      thistle: [216, 191, 216],
      tomato: [255, 99, 71],
      turquoise: [64, 224, 208],
      violet: [238, 130, 238],
      wheat: [245, 222, 179],
      white: [255, 255, 255],
      whitesmoke: [245, 245, 245],
      yellow: [255, 255, 0],
      yellowgreen: [154, 205, 50]
    },
    a = { red: 0, orange: 60, yellow: 120, green: 180, blue: 240, purple: 300 }
  var s = window.navigator.userAgent,
    d = /Android|iPhone/i.test(s),
    c = Object.prototype.toString
  function l(n, t) {
    return (
      (function (n) {
        if (null === n) return 'null'
        var t = typeof n
        if ('object' !== t) return t
        var e = (t = c.call(n).slice(8, -1)).toLowerCase()
        return 'object' === e || ('number' !== e && 'boolean' !== e && 'string' !== e) ? e : t
      })(n) === t
    )
  }
  function p(n) {
    return l(n, 'object')
  }
  function u(n) {
    if (!p(n)) return !1
    var t = n.constructor
    if ('function' != typeof t) return !1
    var e = t.prototype
    return !!p(e) && e.hasOwnProperty('isPrototypeOf')
  }
  var f = Array.isArray
  function h(n) {
    var t = (function (n) {
        var t,
          e,
          o = [],
          r = 1
        if ('number' == typeof n)
          return { space: 'rgb', values: [n >>> 16, (65280 & n) >>> 8, 255 & n], alpha: 1 }
        if ('number' == typeof n)
          return { space: 'rgb', values: [n >>> 16, (65280 & n) >>> 8, 255 & n], alpha: 1 }
        if (((n = String(n).toLowerCase()), i[n])) ((o = i[n].slice()), (e = 'rgb'))
        else if ('transparent' === n) ((r = 0), (e = 'rgb'), (o = [0, 0, 0]))
        else if ('#' === n[0]) {
          var s = n.slice(1),
            d = s.length
          ;((r = 1),
            d <= 4
              ? ((o = [
                  parseInt(s[0] + s[0], 16),
                  parseInt(s[1] + s[1], 16),
                  parseInt(s[2] + s[2], 16)
                ]),
                4 === d && (r = parseInt(s[3] + s[3], 16) / 255))
              : ((o = [
                  parseInt(s[0] + s[1], 16),
                  parseInt(s[2] + s[3], 16),
                  parseInt(s[4] + s[5], 16)
                ]),
                8 === d && (r = parseInt(s[6] + s[7], 16) / 255)),
            o[0] || (o[0] = 0),
            o[1] || (o[1] = 0),
            o[2] || (o[2] = 0),
            (e = 'rgb'))
        } else if (
          (t =
            /^((?:rgba?|hs[lvb]a?|hwba?|cmyk?|xy[zy]|gray|lab|lchu?v?|[ly]uv|lms|oklch|oklab|color))\s*\(([^)]*)\)/.exec(
              n
            ))
        ) {
          var c = t[1],
            l = 'cmyk' === (e = c.replace(/a$/, '')) ? 4 : 'gray' === e ? 1 : 3
          ;((o = t[2].trim().split(/\s*[,/]\s*|\s+/)),
            'color' === e && (e = o.shift()),
            (r =
              (o = o.map(function (n, t) {
                if ('%' === n[n.length - 1])
                  return (
                    (n = parseFloat(n) / 100),
                    3 === t
                      ? n
                      : 'rgb' === e
                        ? 255 * n
                        : 'h' === e[0]
                          ? 100 * n
                          : 'l' !== e[0] || t
                            ? 'lab' === e
                              ? 125 * n
                              : 'lch' === e
                                ? t < 2
                                  ? 150 * n
                                  : 360 * n
                                : 'o' !== e[0] || t
                                  ? 'oklab' === e
                                    ? 0.4 * n
                                    : 'oklch' === e
                                      ? t < 2
                                        ? 0.4 * n
                                        : 360 * n
                                      : n
                                  : n
                            : 100 * n
                  )
                if ('h' === e[t] || (2 === t && 'h' === e[e.length - 1])) {
                  if (void 0 !== a[n]) return a[n]
                  if (n.endsWith('deg')) return parseFloat(n)
                  if (n.endsWith('turn')) return 360 * parseFloat(n)
                  if (n.endsWith('grad')) return (360 * parseFloat(n)) / 400
                  if (n.endsWith('rad')) return (180 * parseFloat(n)) / Math.PI
                }
                return 'none' === n ? 0 : parseFloat(n)
              })).length > l
                ? o.pop()
                : 1))
        } else
          /[0-9](?:\s|\/|,)/.test(n) &&
            ((o = n.match(/([0-9]+)/g).map(function (n) {
              return parseFloat(n)
            })),
            (e =
              n
                .match(/([a-z])/gi)
                ?.join('')
                ?.toLowerCase() || 'rgb'))
        return { space: e, values: o, alpha: r }
      })(n),
      e = t.values
    return (t.alpha * (299 * e[0] + 587 * e[1] + 114 * e[2])) / 1e3 < 150
  }
  var m = '[📄 KyndForm Embed v0.0.8]',
    g = function () {
      for (var n = [], t = 0; t < arguments.length; t++) n[t] = arguments[t]
      console.log.apply(console, r([m], n, !1))
    },
    y = function () {
      for (var n = [], t = 0; t < arguments.length; t++) n[t] = arguments[t]
      console.error.apply(console, r([m], n, !1))
    },
    _ = (function () {
      function n(t, e) {
        if ((void 0 === e && (e = document), (this.elements = []), (this.length = 0), t)) {
          if (t instanceof n) return t
          if (t.nodeType) this.elements[0] = t
          else {
            var o = f(e) ? e : [e]
            this.elements = o.reduce(function (n, e) {
              return r(r([], n, !0), Array.from(e.querySelectorAll(t)), !0)
            }, [])
          }
          this.length = this.elements.length
        }
      }
      return (
        (n.prototype.each = function (n) {
          return (this.elements.forEach(n), this)
        }),
        (n.prototype.map = function (n) {
          return this.elements.map(n)
        }),
        (n.prototype.addClass = function (n) {
          return (
            this.elements.forEach(function (t) {
              return t.classList.add(n)
            }),
            this
          )
        }),
        (n.prototype.removeClass = function (n) {
          return (
            this.elements.forEach(function (t) {
              return t.classList.remove(n)
            }),
            this
          )
        }),
        (n.prototype.style = function (n, t) {
          var e,
            o = (((e = {})[n] = t), e)
          return (
            u(n) && (o = n),
            this.elements.forEach(function (n) {
              Object.assign(n.style, o)
            }),
            this
          )
        }),
        (n.prototype.find = function (t) {
          return new n(t, this.elements)
        }),
        (n.prototype.get = function (n) {
          return this.elements[n]
        }),
        (n.prototype.on = function (n, t) {
          return (
            this.elements.forEach(function (e) {
              return e.addEventListener(n, t)
            }),
            this
          )
        }),
        (n.prototype.off = function (n, t) {
          return (
            this.elements.forEach(function (e) {
              return e.removeEventListener(n, t)
            }),
            this
          )
        }),
        (n.prototype.rect = function () {
          return this.elements[0].getBoundingClientRect()
        }),
        (n.prototype.html = function (n) {
          return (
            this.elements.forEach(function (t) {
              return (t.innerHTML = n)
            }),
            this
          )
        }),
        (n.prototype.remove = function () {
          return (
            this.elements.forEach(function (n) {
              return n.remove()
            }),
            this
          )
        }),
        (n.prototype.exists = function () {
          return this.length > 0
        }),
        (n.prototype.append = function (n) {
          return (
            this.elements.forEach(function (t) {
              return t.insertAdjacentHTML('beforeend', n)
            }),
            this
          )
        }),
        (n.compile = function (n, t) {
          return n.replace(/\{(\w+)\}/g, function (n, e) {
            return t[e] || ''
          })
        }),
        (n.template = function (t, e, o) {
          ;(void 0 === o && (o = document.body), o.insertAdjacentHTML('beforeend', n.compile(t, e)))
        }),
        n
      )
    })()
  function k(n, t) {
    return (void 0 === t && (t = document), new _(n, t))
  }
  var v = ['data-kyndform-', 'data-kyndform-']
  var b =
      '<svg width="22" height="5" viewBox="0 0 21 5" fill="none" xmlns="http://www.w3.org/2000/svg" class="kyndform__loading">\n    <rect class="kyndform__loading-dot" width="5" height="5" rx="2.5" fill="currentColor"/>\n    <rect class="kyndform__loading-dot" x="8" width="5" height="5" rx="2.5" fill="currentColor"/>\n    <rect class="kyndform__loading-dot" x="16" width="5" height="5" rx="2.5" fill="currentColor"/>\n</svg>',
    w =
      '\n<div class="kyndform__iframe-container">\n  <iframe src="{src}" allow="microphone; camera"></iframe>\n  <div class="kyndform__loading-container">'.concat(
        b,
        '</div>\n</div>\n'
      ),
    x = (function () {
      function n(n) {
        var t = n.formId,
          e = n.type,
          r = n.container,
          i = n.settings,
          a = n.hiddenFields,
          s = i.customUrl
        ;(s
          ? s.includes(t) || (s = ''.concat(s.replace(/\/+$/, ''), '/form/').concat(t))
          : (s = '/form/'.concat(t)),
          (this.formUrl = (function (n, t) {
            var e = new URLSearchParams()
            for (var o in t) e.append(o, t[o])
            return n + (n.includes('?') ? '&' : '?') + e.toString()
          })(s, o(o({}, i), a))),
          r.addClass('kyndform__embed'),
          r.addClass('kyndform__embed-'.concat(e)),
          (this.formId = t),
          (this.containerId = 'kyndform__'.concat(e, '-').concat(t)),
          (this.$container = r),
          (this.settings = i),
          this.render())
      }
      return (
        (n.prototype.render = function () {
          var n = this
          ;(this.$container.style(
            'width',
            ''.concat(this.settings.width).concat(this.settings.widthType)
          ),
            setTimeout(function () {
              var t = ''.concat(n.settings.height).concat(n.settings.heightType)
              if (n.settings.autoResizeHeight) {
                var e = n.$container.rect()
                t = (d ? window.innerHeight : Math.min(window.innerHeight, 0.6 * e.width)) + 'px'
              }
              n.$container.style('height', t)
            }, 0),
            this.$container.append(_.compile(w, { src: this.formUrl })),
            (this.$container.find('iframe').get(0).onload = function () {
              n.$container.find('.kyndform__loading-container').remove()
            }))
        }),
        n
      )
    })(),
    I =
      '\n<div class="kyndform__iframe-container">\n  <iframe src="{src}" allow="microphone; camera"></iframe>\n  <div class="kyndform__loading-container">'.concat(
        b,
        '</div>\n</div>\n'
      ),
    E = (function (n) {
      function t() {
        return (null !== n && n.apply(this, arguments)) || this
      }
      return (
        e(t, n),
        (t.prototype.render = function () {
          this.$container
            .style({
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              zIndex: '9999'
            })
            .append(_.compile(I, { src: this.formUrl }))
        }),
        t
      )
    })(x),
    M =
      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"\n     stroke-width="2" stroke-linecap="round" stroke-linejoin="round">\n    <path stroke="none" d="M0 0h24v24H0z" fill="none"/>\n    <path d="M18 6l-12 12"/>\n    <path d="M6 6l12 12"/>\n</svg>',
    C =
      '\n  <div id="{containerId}" class="kyndform__modal kyndform__modal-{size}">\n    <div class="kyndform__iframe-container">\n      <iframe src="{src}" allow="microphone; camera"></iframe>\n      <div class="kyndform__loading-container">'
        .concat(
          b,
          '</div>\n    </div>\n    <button type="button" class="kyndform__close-button" onclick="KyndForm.closeModal(\'{formId}\')">\n      '
        )
        .concat(M, '\n    </button>\n  </div>\n'),
    O = (function (n) {
      function t() {
        var t = (null !== n && n.apply(this, arguments)) || this
        return ((t.isOpen = !1), t)
      }
      return (
        e(t, n),
        (t.prototype.render = function () {
          var n = this,
            t = this.$container.find('.kyndform__trigger-button')
          ;(t.exists() &&
            (this.settings.triggerBackground &&
              (t.style('background', this.settings.triggerBackground),
              h(this.settings.triggerBackground) && t.addClass('kyndform__trigger-button-dark')),
            t.on('click', function () {
              n.open()
            })),
            this.handleEvents())
        }),
        (t.prototype.open = function () {
          var n = this
          k('#'.concat(this.containerId)).exists() ||
            (_.template(C, {
              containerId: this.containerId,
              formId: this.formId,
              src: this.formUrl,
              size: this.settings.size || 'medium'
            }),
            (this.isOpen = !0),
            g('Modal opened'),
            setTimeout(function () {
              var t = k('#'.concat(n.containerId))
              t.find('iframe').get(0).onload = function () {
                t.find('.kyndform__loading-container').remove()
              }
            }, 0))
        }),
        (t.prototype.close = function () {
          ;(k('#'.concat(this.containerId)).remove(), (this.isOpen = !1), g('Modal closed'))
        }),
        (t.prototype.toggle = function () {
          this.isOpen ? this.close() : this.open()
        }),
        (t.prototype.handleEvents = function () {
          var n = this
          if (this.settings.openTrigger)
            switch ((g('Open event', this.settings.openTrigger), this.settings.openTrigger)) {
              case 'load':
              case 'loaded':
                return this.onLoaded()
              case 'delay':
                return this.onDelay()
              case 'exit':
                return this.onExit()
              case 'scroll':
                return this.onScroll()
            }
          this.settings.hideAfterSubmit &&
            window.addEventListener('message', function (t) {
              var e = t.data
              if (u(e) && 'KYNDFORM' === e.source)
                switch ((g('Message event', e), e.eventName)) {
                  case 'HIDE_EMBED_MODAL':
                  case 'HIDE_EMBED_POPUP':
                    return setTimeout(
                      function () {
                        n.close()
                      },
                      1e3 * (n.settings.autoClose || 0)
                    )
                }
            })
        }),
        (t.prototype.onLoaded = function () {
          var n = this
          'undefined' == typeof document ||
          ('complete' !== document.readyState && 'interactive' !== document.readyState)
            ? window.addEventListener(
                'load',
                function () {
                  n.open()
                },
                { once: !0 }
              )
            : this.open()
        }),
        (t.prototype.onDelay = function () {
          var n = this
          setTimeout(function () {
            n.open()
          }, this.settings.openDelay)
        }),
        (t.prototype.onExit = function () {
          var n = this
          window.addEventListener('mouseout', function (t) {
            t.toElement || t.relatedTarget || n.open()
          })
        }),
        (t.prototype.onScroll = function () {
          var n = this,
            t = function () {
              ;((window.scrollY + window.innerHeight) / document.body.clientHeight) * 100 >=
                n.settings.openScrollPercent / 100 &&
                (n.open(), window.removeEventListener('scroll', t))
            }
          window.addEventListener('scroll', t)
        }),
        t
      )
    })(x),
    L =
      '\n  <div class="kyndform__iframe-container" style="{style}">\n    <iframe src="{src}" allow="microphone; camera"></iframe>\n    <div class="kyndform__loading-container">'.concat(
        b,
        '</div>\n  </div>\n'
      ),
    A = (function (n) {
      function t() {
        return (null !== n && n.apply(this, arguments)) || this
      }
      return (
        e(t, n),
        (t.prototype.render = function () {
          if (!k('#'.concat(this.containerId)).exists()) {
            var n = {
              containerId: this.containerId,
              formId: this.formId,
              position: this.settings.position || 'bottom-right',
              icon: this.getIcon()
            }
            ;(this.settings.triggerBackground &&
              ((n.buttonStyle = 'background: '.concat(this.settings.triggerBackground)),
              h(this.settings.triggerBackground) &&
                (n.buttonClass = 'kyndform__popup-button-dark')),
              _.template(
                '\n  <div id="{containerId}" class="kyndform__popup kyndform__popup-{position}">\n    <button class="kyndform__popup-button {buttonClass}" style="{buttonStyle}" onclick="KyndForm.togglePopup(\'{formId}\')">\n      {icon}\n    </button>\n  </div>\n',
                n
              ),
              this.handleEvents())
          }
        }),
        (t.prototype.open = function () {
          var n = k('#'.concat(this.containerId))
          if (n.exists() && !n.find('.kyndform__iframe-container').exists()) {
            var t = this.settings.width || 420,
              e = this.settings.height || 540
            ;(n.append(
              _.compile(L, {
                containerId: this.containerId,
                src: this.formUrl,
                style: 'width:'.concat(t, 'px; height:').concat(e, 'px')
              })
            ),
              (this.isOpen = !0),
              this.updateButtonIcon(),
              setTimeout(function () {
                n.find('iframe').get(0).onload = function () {
                  n.find('.kyndform__loading-container').remove()
                }
              }, 0),
              g('Popup opened'))
          }
        }),
        (t.prototype.close = function () {
          ;(k('#'.concat(this.containerId, ' .kyndform__iframe-container')).remove(),
            (this.isOpen = !1),
            this.updateButtonIcon(),
            g('Popup closed'))
        }),
        (t.prototype.updateButtonIcon = function () {
          var n = k('#'.concat(this.containerId, ' .kyndform__popup-button'))
          n && n.html(this.getIcon())
        }),
        (t.prototype.getIcon = function () {
          var n =
            '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"\n     stroke-width="2" stroke-linecap="round" stroke-linejoin="round">\n    <path stroke="none" d="M0 0h24v24H0z" fill="none"/>\n    <path d="M12 11v.01"/>\n    <path d="M8 11v.01"/>\n    <path d="M16 11v.01"/>\n    <path d="M18 4a3 3 0 0 1 3 3v8a3 3 0 0 1 -3 3h-5l-5 3v-3h-2a3 3 0 0 1 -3 -3v-8a3 3 0 0 1 3 -3z"/>\n</svg>'
          return (
            this.isOpen
              ? (n = M)
              : this.settings.iconUrl &&
                (n = '<img src="'.concat(this.settings.iconUrl, '" alt="popup trigger" />')),
            n
          )
        }),
        t
      )
    })(O)
  !(function (n, t) {
    void 0 === t && (t = {})
    var e = t.insertAt
    if ('undefined' != typeof document) {
      var o = document.head || document.getElementsByTagName('head')[0],
        r = document.createElement('style')
      ;((r.type = 'text/css'),
        'top' === e && o.firstChild ? o.insertBefore(r, o.firstChild) : o.appendChild(r),
        r.styleSheet ? (r.styleSheet.cssText = n) : r.appendChild(document.createTextNode(n)))
    }
  })(
    '.kyndform__embed *:after, .kyndform__embed *:before,\n.kyndform__modal *:after,\n.kyndform__modal *:before {\n  box-sizing: border-box;\n  margin: 0;\n  padding: 0;\n}\n\n.kyndform__embed-standard iframe,\n.kyndform__embed-fullpage iframe,\n.kyndform__iframe-container iframe {\n  width: 100%;\n  height: 100%;\n  border: none;\n  overflow: hidden;\n  min-height: inherit;\n  transform: translateZ(0);\n}\n\n.kyndform__trigger-button {\n  padding: 8px 24px;\n  font-size: 16px;\n  line-height: 1.5;\n  font-weight: 500;\n  background: #fff;\n  color: #020617;\n  border: none;\n  border-radius: 9999px;\n  box-shadow: rgba(0, 0, 0, 0.05) 0 1px 2px 0;\n  transition: opacity 0.2s ease-in-out;\n  cursor: pointer;\n}\n.kyndform__trigger-button.kyndform__trigger-button-dark {\n  background: #020617;\n  color: #fff;\n}\n.kyndform__trigger-button:hover {\n  opacity: 0.8;\n}\n\n.kyndform__modal {\n  position: fixed;\n  top: 0;\n  left: 0;\n  width: 100%;\n  height: 100%;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  background: rgba(0, 0, 0, 0.85);\n  transition: opacity 0.2s ease-in-out;\n  z-index: 10001;\n}\n.kyndform__modal .kyndform__iframe-container {\n  color: #fff;\n}\n\n.kyndform__modal-large .kyndform__iframe-container {\n  width: calc(100% - 80px);\n  height: calc(100% - 80px);\n}\n\n.kyndform__modal-medium .kyndform__iframe-container {\n  width: calc(85% - 80px);\n  height: calc(85% - 80px);\n}\n\n.kyndform__modal-small .kyndform__iframe-container {\n  width: calc(70% - 80px);\n  height: calc(70% - 80px);\n}\n\n.kyndform__close-button {\n  position: absolute;\n  top: 8px;\n  right: 8px;\n  background: transparent;\n  border: none;\n  color: #fff;\n  font-size: 16px;\n  padding: 2px;\n  cursor: pointer;\n  transition: opacity 0.2s ease-in-out;\n}\n.kyndform__close-button:hover {\n  opacity: 0.8;\n}\n\n.kyndform__iframe-container {\n  position: relative;\n  height: 100%;\n}\n.kyndform__iframe-container,\n.kyndform__iframe-container iframe {\n  overflow: hidden;\n  border-radius: 8px;\n}\n\n.kyndform__popup-button {\n  position: fixed;\n  width: 54px;\n  height: 54px;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  border-radius: 50%;\n  cursor: pointer;\n  background: #fff;\n  color: #020617;\n  border: none;\n  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06), 0 2px 4px rgba(0, 0, 0, 0.08);\n  transition: transform 0.2s ease-in-out;\n  transform-origin: center;\n  z-index: 10000;\n}\n.kyndform__popup-button.kyndform__popup-button-dark {\n  background: #020617;\n  color: #fff;\n}\n.kyndform__popup-button:hover {\n  transform: scale(1.05);\n}\n.kyndform__popup-button svg {\n  width: 24px;\n  height: 24px;\n}\n\n.kyndform__popup .kyndform__iframe-container {\n  position: fixed;\n  z-index: 10000;\n  background: #fff;\n  box-shadow: rgba(0, 0, 0, 0.08) 0 2px 4px, rgba(0, 0, 0, 0.06) 0 2px 12px;\n}\n.kyndform__popup.kyndform__popup-bottom-right .kyndform__popup-button {\n  right: 24px;\n  bottom: 24px;\n}\n.kyndform__popup.kyndform__popup-bottom-right .kyndform__iframe-container {\n  right: 24px;\n  bottom: 94px;\n}\n.kyndform__popup.kyndform__popup-bottom-left .kyndform__popup-button {\n  left: 24px;\n  bottom: 24px;\n}\n.kyndform__popup.kyndform__popup-bottom-left .kyndform__iframe-container {\n  left: 24px;\n  bottom: 94px;\n}\n\n.kyndform__loading-container {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  position: absolute;\n  top: 0;\n  left: 0;\n  width: 100%;\n  height: 100%;\n  font-size: 24px;\n}\n.kyndform__loading-container svg {\n  width: 28px;\n  height: 6px;\n}\n\n@keyframes kyndform__loading {\n  0% {\n    opacity: 0.2;\n  }\n  20% {\n    opacity: 1;\n  }\n  100% {\n    opacity: 0.2;\n  }\n}\n.kyndform__loading-dot {\n  animation-name: kyndform__loading;\n  animation-duration: 1.4s;\n  animation-iteration-count: infinite;\n  animation-fill-mode: both;\n}\n.kyndform__loading-dot:nth-of-type(2) {\n  animation-delay: 0.2s;\n}\n.kyndform__loading-dot:nth-of-type(3) {\n  animation-delay: 0.4s;\n}'
  )
  var P = new Set(),
    S = new Map()
  function T() {
    try {
      var n = k('[data-kyndform-id], [data-kyndform-id]').map(function (n) {
        var t = {},
          e = {}
        return (
          n.getAttributeNames().forEach(function (o) {
            for (var r = o.toLowerCase(), i = 0, a = v; i < a.length; i++) {
              var s = a[i],
                d = ''.concat(s, 'hiddenfield-')
              if (r.startsWith(d)) return ((r = r.replace(d, '')), void (e[r] = n.getAttribute(o)))
              if (r.startsWith(s))
                return (
                  (r = r.replace(s, '').replace(/(-)+([a-z])/gi, function (n, t, e) {
                    return e.toUpperCase()
                  })),
                  void (t[r] = n.getAttribute(o))
                )
            }
          }),
          {
            formId: n.getAttribute('data-kyndform-id') || n.getAttribute('data-kyndform-id'),
            type: n.getAttribute('data-kyndform-type') || n.getAttribute('data-kyndform-type'),
            container: k(n),
            settings: t,
            hiddenFields: e
          }
        )
      })
      ;(n.forEach(function (n) {
        var t = ''.concat(n.formId, '-').concat(n.type)
        if (!P.has(t))
          switch ((P.add(t), n.type)) {
            case 'modal':
              return S.set(t, new O(n))
            case 'popup':
              return S.set(t, new A(n))
            case 'fullpage':
              return new E(n)
            default:
              return new x(n)
          }
      }),
        g('Configs', JSON.stringify(n)))
    } catch (n) {
      y(n)
    }
  }
  function j(n, t) {
    var e = S.get(''.concat(n, '-').concat(t))
    e && e.open()
  }
  function z(n, t) {
    var e = S.get(''.concat(n, '-').concat(t))
    e && e.close()
  }
  function B(n, t) {
    var e = S.get(''.concat(n, '-').concat(t))
    e && e.toggle()
  }
  var F = function (n) {
      return j(n, 'modal')
    },
    H = function (n) {
      return z(n, 'modal')
    },
    U = function (n) {
      return B(n, 'modal')
    },
    $ = function (n) {
      return j(n, 'popup')
    },
    q = function (n) {
      return z(n, 'popup')
    },
    D = function (n) {
      return B(n, 'popup')
    },
    K = {
      openModal: F,
      closeModal: H,
      toggleModal: U,
      openPopup: $,
      closePopup: q,
      togglePopup: D,
      init: T
    }
  ;('undefined' != typeof window && (window.KyndForm = K),
    T(),
    'undefined' != typeof document &&
      'loading' === document.readyState &&
      window.addEventListener('DOMContentLoaded', T),
    (n.closeModal = H),
    (n.closePopup = q),
    (n.openModal = F),
    (n.openPopup = $),
    (n.toggleModal = U),
    (n.togglePopup = D))
})
//# sourceMappingURL=index.umd.js.map
