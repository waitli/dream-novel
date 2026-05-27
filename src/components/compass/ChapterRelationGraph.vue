<script setup>
import { ref, onMounted, onBeforeUnmount, watch, nextTick, shallowRef } from 'vue'
import * as echarts from 'echarts/core'
import { GraphChart } from 'echarts/charts'
import { LegendComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import 'echarts/theme/dark'
import { useSettingsStore } from '../../stores/settings'
import { getFactionColorMap, RELATION_LABELS, toEChartsGraphData } from '../../utils/graph-helpers'

echarts.use([GraphChart, LegendComponent, TooltipComponent, CanvasRenderer])

const props = defineProps({
  graphData: Object, // { nodes, edges }
  height: { type: Number, default: 360 }
})

const settings = useSettingsStore()
const containerRef = ref(null)
const chart = shallowRef(null)
let resizeObserver = null

function createChart() {
  if (!containerRef.value) return
  if (chart.value) {
    chart.value.dispose()
    chart.value = null
  }
  chart.value = echarts.init(containerRef.value, settings.isDark ? 'dark' : null)
}

function renderData(data) {
  if (!chart.value || !data) return
  const isDark = settings.isDark
  const factionColorMap = getFactionColorMap(data.nodes || [])
  const { nodes, links, categories } = toEChartsGraphData(data, isDark, factionColorMap)

  chart.value.setOption({
    tooltip: {
      trigger: 'item',
      formatter: (params) => {
        if (params.dataType === 'node') {
          const raw = params.data._raw
          return raw ? `<b>${raw.label}</b>${raw.bio ? '<br/>' + raw.bio : ''}` : params.data.name
        }
        if (params.dataType === 'edge') {
          const raw = params.data._raw
          if (!raw) return ''
          return `${raw.label || ''}<br/>类型: ${RELATION_LABELS[raw.relationType] || raw.relationType}`
        }
        return ''
      }
    },
    legend: [{
      data: categories.map(c => c.name),
      textStyle: { color: isDark ? '#e2e8f0' : '#1f2937', fontSize: 10 },
      top: 4, right: 8, itemWidth: 10, itemHeight: 10
    }],
    animationDuration: 1000,
    animationEasingUpdate: 'quinticInOut',
    backgroundColor: 'transparent',
    series: [{
      type: 'graph',
      layout: 'force',
      data: nodes,
      links,
      categories,
      roam: true,
      label: {
        position: 'right',
        formatter: '{b}',
        color: isDark ? '#e2e8f0' : '#1e293b',
        fontSize: 11
      },
      lineStyle: { curveness: 0.2 },
      emphasis: { focus: 'adjacency', lineStyle: { width: 4 } },
      force: {
        repulsion: 180,
        edgeLength: [60, 160],
        gravity: 0.1,
        friction: 0.6
      },
      scaleLimit: { min: 0.3, max: 3 }
    }]
  }, true)
}

watch(() => props.graphData, (val) => {
  if (val && chart.value) renderData(val)
}, { deep: true })

watch(() => settings.isDark, () => {
  if (chart.value) {
    chart.value.dispose()
    chart.value = null
    createChart()
    nextTick(() => { if (props.graphData) renderData(props.graphData) })
  }
})

onMounted(async () => {
  await nextTick()
  createChart()
  if (props.graphData) renderData(props.graphData)

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
  <div ref="containerRef" class="w-full rounded-lg overflow-hidden" :style="{ height: height + 'px' }" />
</template>
