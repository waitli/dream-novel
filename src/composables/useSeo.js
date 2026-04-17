import { computed, onBeforeUnmount, unref, watchEffect } from 'vue'

const SITE_URL = import.meta.env.VITE_SITE_URL || 'https://novel.waitli.top'
const SITE_NAME = 'AI 小说生成器'

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function ensureMeta(name, content, attr = 'name') {
  const selector = `meta[${attr}="${name}"]`
  let el = document.head.querySelector(selector)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, name)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function ensureLink(rel, href) {
  let el = document.head.querySelector(`link[rel="${rel}"]`)
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', rel)
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

function ensureJsonLd(id, value) {
  const selector = `script[data-seo-jsonld="${id}"]`
  let el = document.head.querySelector(selector)

  if (!value) {
    if (el) {
      el.remove()
    }
    return
  }

  const json = JSON.stringify(value)
  if (!el) {
    el = document.createElement('script')
    el.type = 'application/ld+json'
    el.setAttribute('data-seo-jsonld', id)
    document.head.appendChild(el)
  }
  el.textContent = json
}

function toAbsoluteUrl(path) {
  return new URL(path.startsWith('/') ? path : `/${path}`, SITE_URL).toString()
}

export function useSeo(options) {
  const resolvedTitle = computed(() => normalizeText(unref(options.title) || SITE_NAME))
  const resolvedDescription = computed(() =>
    normalizeText(unref(options.description) || 'AI 小说生成器，基于雪花写作法的智能小说创作工具')
  )
  const resolvedPath = computed(() => {
    const path = unref(options.path) || '/'
    return path.startsWith('/') ? path : `/${path}`
  })
  const resolvedLang = computed(() => unref(options.lang) || 'zh-CN')
  const resolvedNoindex = computed(() => Boolean(unref(options.noindex)))
  const resolvedSchema = computed(() => unref(options.schema) || null)

  const stop = watchEffect(() => {
    const title = resolvedTitle.value
    const description = resolvedDescription.value
    const canonical = toAbsoluteUrl(resolvedPath.value)
    const robots = resolvedNoindex.value ? 'noindex,nofollow' : 'index,follow'
    const image = toAbsoluteUrl('/logo.png')

    document.title = title
    document.documentElement.lang = resolvedLang.value

    ensureMeta('description', description)
    ensureMeta('robots', robots)
    ensureMeta('title', title)
    ensureMeta('og:site_name', SITE_NAME, 'property')
    ensureMeta('og:type', 'website', 'property')
    ensureMeta('og:url', canonical, 'property')
    ensureMeta('og:title', title, 'property')
    ensureMeta('og:description', description, 'property')
    ensureMeta('og:image', image, 'property')
    ensureMeta('twitter:card', 'summary_large_image')
    ensureMeta('twitter:title', title)
    ensureMeta('twitter:description', description)
    ensureMeta('twitter:image', image)
    ensureMeta('application-name', SITE_NAME)
    ensureLink('canonical', canonical)
    ensureJsonLd('main', resolvedSchema.value)
  })

  onBeforeUnmount(() => stop())
}
