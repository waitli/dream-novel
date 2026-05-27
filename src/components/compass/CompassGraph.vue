<script setup>
import { ref, onMounted, onBeforeUnmount, watch, nextTick, shallowRef } from 'vue'
import * as echarts from 'echarts/core'
import { GraphChart } from 'echarts/charts'
import { LegendComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import 'echarts/theme/dark'
import { useSettingsStore } from '../../stores/settings'
import { getFactionColorMap, RELATION_COLORS, RELATION_LABELS, toEChartsGraphData } from '../../utils/graph-helpers'

echarts.use([GraphChart, LegendComponent, TooltipComponent, CanvasRenderer])

const props = defineProps({
  snapshot: Object,
  focusNodeId: String
})

const emit = defineEmits(['node-click', 'edge-click', 'node-dblclick', 'canvas-dblclick'])

const settings = useSettingsStore()
const containerRef = ref(null)
const chart = shallowRef(null)
let resizeObserver = null
let isInFocusMode = false
let clickTimer = null
let fullGraphData = null

function createChart() {
  if (!containerRef.value) return
  if (chart.value) {
    chart.value.dispose()
    chart.value = null
  }
  const isDark = settings.isDark
  chart.value = echarts.init(containerRef.value, isDark ? 'dark' : null)

  // 点击事件
  chart.value.on('click', (params) => {
    if (params.dataType === 'node') {
      if (clickTimer) {
        clearTimeout(clickTimer)
        clickTimer = null
        // double click
        isInFocusMode = true
        emit('node-dblclick', params.data.id)
        enterFocusMode(params.data.id)
        return
      }
      clickTimer = setTimeout(() => {
        clickTimer = null
        emit('node-click', params.data.id)
      }, 280)
    } else if (params.dataType === 'edge') {
      const raw = params.data._raw
      if (raw) emit('edge-click', raw.id)
    }
  })

  // 背景点击退出聚焦
  chart.value.getZr().on('click', (e) => {
    if (!e.target && isInFocusMode) {
      isInFocusMode = false
      emit('canvas-dblclick')
      exitFocusMode()
    }
  })
}
function buildOption(snapshot) {
  if (!snapshot) return null
  const isDark = settings.isDark
  const factionColorMap = getFactionColorMap(snapshot.nodes || [])
  const { nodes, links, categories } = toEChartsGraphData(snapshot, isDark, factionColorMap)
  fullGraphData = { nodes, links, categories }

  return {
    tooltip: {
      trigger: 'item',
      formatter: (params) => {
        if (params.dataType === 'node') {
          const raw = params.data._raw
          if (!raw) return params.data.name
          let s = `<b>${raw.label}</b>`
          if (raw.bio) s += `<br/>${raw.bio}`
          if (raw.faction) s += `<br/>阵营: ${raw.faction}`
          return s
        }
        if (params.dataType === 'edge') {
          const raw = params.data._raw
          if (!raw) return ''
          return `${raw.label || ''}<br/>类型: ${RELATION_LABELS[raw.relationType] || raw.relationType}<br/>强度: ${raw.strength || '-'}`
        }
        return ''
      }
    },
    legend: [{
      data: categories.map(c => c.name),
      textStyle: { color: isDark ? '#e2e8f0' : '#1f2937' },
      top: 12,
      right: 16
    }],
    animationDuration: 1200,
    animationEasingUpdate: 'quinticInOut',
    backgroundColor: 'transparent',
    series: [{
      type: 'graph',
      layout: 'force',
      data: nodes,
      links,
      categories,
      roam: true,
      draggable: true,
      label: {
        position: 'right',
        formatter: '{b}',
        color: isDark ? '#e2e8f0' : '#1e293b',
        fontSize: 12
      },
      lineStyle: {
        curveness: 0.2
      },
      emphasis: {
        focus: 'adjacency',
        lineStyle: { width: 6 }
      },
      force: {
        repulsion: 260,
        edgeLength: [80, 220],
        gravity: 0.08,
        friction: 0.6
      },
      scaleLimit: { min: 0.3, max: 3 }
    }]
  }
}

function renderSnapshot(snapshot) {
  if (!chart.value || !snapshot) return
  const option = buildOption(snapshot)
  if (option) chart.value.setOption(option, true)
}

function enterFocusMode(nodeId) {
  if (!chart.value || !fullGraphData) return
  const neighbors = new Set([nodeId])
  fullGraphData.links.forEach(l => {
    if (l.source === nodeId) neighbors.add(l.target)
    if (l.target === nodeId) neighbors.add(l.source)
  })
  const nodes = fullGraphData.nodes.map(n => ({
    ...n,
    itemStyle: {
      ...n.itemStyle,
      opacity: neighbors.has(n.id) ? (n.itemStyle?.opacity || 1) : 0.1
    },
    label: { ...n.label, show: neighbors.has(n.id) }
  }))
  const links = fullGraphData.links.map(l => ({
    ...l,
    lineStyle: {
      ...l.lineStyle,
      opacity: (neighbors.has(l.source) && neighbors.has(l.target)) ? 0.6 : 0.05
    }
  }))
  chart.value.setOption({ series: [{ data: nodes, links }] })
}

function exitFocusMode() {
  if (!chart.value || !fullGraphData) return
  chart.value.setOption({
    series: [{ data: fullGraphData.nodes, links: fullGraphData.links }]
  })
}

function exportPNG() {
  if (!chart.value) return null
  return chart.value.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: settings.isDark ? '#0f172a' : '#f8fafc' })
}

defineExpose({ exportPNG, renderSnapshot })

watch(() => props.snapshot, (val) => {
  if (val && chart.value) renderSnapshot(val)
}, { deep: true })

watch(() => settings.isDark, () => {
  if (chart.value && props.snapshot) {
    chart.value.dispose()
    chart.value = null
    createChart()
    nextTick(() => renderSnapshot(props.snapshot))
  }
})

onMounted(async () => {
  await nextTick()
  createChart()
  if (props.snapshot) renderSnapshot(props.snapshot)

  resizeObserver = new ResizeObserver(() => {
    if (chart.value) chart.value.resize()
  })
  if (containerRef.value) resizeObserver.observe(containerRef.value)
})

onBeforeUnmount(() => {
  if (resizeObserver) resizeObserver.disconnect()
  if (chart.value) {
    chart.value.dispose()
    chart.value = null
  }
})
</script>

<template>
  <div ref="containerRef" class="w-full h-full min-h-[500px] rounded-lg overflow-hidden" />
</template>
