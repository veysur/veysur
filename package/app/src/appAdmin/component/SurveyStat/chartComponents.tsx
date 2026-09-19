import React from 'react'
import { SlidersHorizontal } from 'lucide-react'
import {
  BarChart,
  Bar,
  Cell,
  LabelList,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
} from 'recharts'
import {
  ChartType,
  ChartValueMode,
  CHART_TYPE_LABELS,
  CHART_VALUE_MODE_LABELS,
} from 'veysur-common'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'component/shadcn/select'
import { Button } from 'component/shadcn/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from 'component/shadcn/popover'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from 'component/shadcn/chart'

import {
  buildConfigFromSeries,
  percentTickFormatter,
  type SeriesKey,
} from './chartUtils'

export interface LegendItem {
  label: string
  color: string
}

/**
 * Shared swatch legend used below every stats chart. The charts use this
 * instead of Recharts' built-in legend so the markup and spacing stay
 * consistent across the bar, stacked and pie-grid variants.
 */
export const ChartLegend: React.FC<{ items: LegendItem[] }> = ({ items }) => (
  <div className="flex flex-wrap items-center justify-center gap-4 pt-4 border-t">
    {items.map((item, index) => (
      <div key={`${item.label}-${index}`} className="flex items-center gap-2">
        <div
          className="h-3 w-3 rounded-sm"
          style={{ backgroundColor: item.color }}
        />
        <span className="text-sm text-muted-foreground">{item.label}</span>
      </div>
    ))}
  </div>
)

const axisPair = (horizontal: boolean, valueMode: ChartValueMode) =>
  horizontal ? (
    <>
      <XAxis type="number" tickFormatter={percentTickFormatter(valueMode)} />
      <YAxis dataKey="name" type="category" width={150} />
    </>
  ) : (
    <>
      <XAxis dataKey="name" />
      <YAxis tickFormatter={percentTickFormatter(valueMode)} />
    </>
  )

/**
 * Grouped or 100%-stacked bar chart with one `<Bar>` per series. Used by the
 * matrix and multi-part stats charts, which plot a subquestion/part against an
 * answer-option axis. Owns its own `ChartContainer` because a Recharts element
 * must be the direct child of the responsive container.
 */
export const GroupedBarChart: React.FC<{
  data: Array<Record<string, string | number>>
  seriesKeys: SeriesKey[]
  valueMode: ChartValueMode
  horizontal?: boolean
  stacked?: boolean
}> = ({ data, seriesKeys, valueMode, horizontal = false, stacked = false }) => (
  <ChartContainer
    config={buildConfigFromSeries(seriesKeys)}
    className="min-h-[300px] w-full"
  >
    <BarChart data={data} layout={horizontal ? 'vertical' : undefined}>
      <CartesianGrid strokeDasharray="3 3" />
      {axisPair(horizontal, valueMode)}
      <ChartTooltip content={<ChartTooltipContent />} />
      {seriesKeys.map((series) => (
        <Bar
          key={series.key}
          dataKey={series.key}
          name={series.label}
          fill={series.color}
          stackId={stacked ? 'a' : undefined}
        />
      ))}
    </BarChart>
  </ChartContainer>
)

/**
 * Single-series distribution bar chart: one `<Bar>` whose bars are individually
 * coloured from each datum's `fill`. Used for a flat answer-option distribution
 * and for the multi-part numeric average bar.
 */
export const DistributionBarChart: React.FC<{
  // Extra numeric fields (count / percentage / average) are read by Recharts
  // via the `dataKey` string at render time, so they need no static type here.
  data: Array<{ name: string; fill: string }>
  dataKey: string
  config: ChartConfig
  valueMode: ChartValueMode
  barName?: string
  horizontal?: boolean
  valueLabels?: boolean
}> = ({
  data,
  dataKey,
  config,
  valueMode,
  barName = 'Responses',
  horizontal = false,
  valueLabels = false,
}) => (
  <ChartContainer config={config} className="min-h-[300px] w-full">
    <BarChart data={data} layout={horizontal ? 'vertical' : undefined}>
      <CartesianGrid strokeDasharray="3 3" />
      {axisPair(horizontal, valueMode)}
      <ChartTooltip content={<ChartTooltipContent />} />
      <Bar dataKey={dataKey} name={barName}>
        {data.map((entry, index) => (
          <Cell key={`cell-${index}`} fill={entry.fill} />
        ))}
        {valueLabels && (
          <LabelList
            dataKey={dataKey}
            position={horizontal ? 'right' : 'top'}
            className="fill-foreground text-xs"
          />
        )}
      </Bar>
    </BarChart>
  </ChartContainer>
)

/**
 * Compact key-figure grid shown beneath a chart (one cell per answer option or
 * part). The caller formats each `value` string, so count/percentage and
 * average summaries share the same layout.
 */
export const StatSummaryGrid: React.FC<{
  items: Array<{ key: string; label: string; value: string }>
}> = ({ items }) => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
    {items.map((item) => (
      <div key={item.key} className="text-sm">
        <div className="font-medium truncate" title={item.label}>
          {item.label}
        </div>
        <div className="text-muted-foreground">{item.value}</div>
      </div>
    ))}
  </div>
)

/**
 * Scrollable wrapper for the always-on numbers table shown beneath the matrix
 * and ranking charts. Only the outer `div` + `table` shell is shared - each
 * caller supplies its own `<thead>`/`<tbody>` since the columns differ.
 */
export const StatNumbersTable: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <div className="overflow-x-auto pt-4 border-t">
    <table className="border-collapse text-sm w-full">{children}</table>
  </div>
)

/**
 * Grid of small pies, one per subquestion/part, slices = answer options. Shared
 * by the matrix and multi-part `pieGrid` chart type - the markup is identical.
 */
export const PieGridChart: React.FC<{
  cells: Array<{
    key: string
    caption: string
    slices: Array<{ name: string; value: number; fill: string }>
  }>
}> = ({ cells }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
    {cells.map((cell) => (
      <div key={cell.key} className="space-y-1">
        <div className="text-sm font-medium text-center truncate">
          {cell.caption}
        </div>
        <ChartContainer config={{}} className="min-h-[180px] w-full">
          <PieChart>
            <Pie
              data={cell.slices}
              dataKey="value"
              cx="50%"
              cy="50%"
              outerRadius={70}
              labelLine={false}
            >
              {cell.slices.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <ChartTooltip content={<ChartTooltipContent />} />
          </PieChart>
        </ChartContainer>
      </div>
    ))}
  </div>
)

/**
 * Chart-type dropdown. Renders nothing when a question type only supports one
 * chart type, so callers can drop it in unconditionally.
 */
export const ChartTypeSelect: React.FC<{
  value: ChartType
  options: ChartType[]
  onChange: (chartType: ChartType) => void
  triggerClassName?: string
}> = ({ value, options, onChange, triggerClassName = 'w-[180px]' }) => {
  if (options.length <= 1) {
    return null
  }

  return (
    <Select value={value} onValueChange={(next) => onChange(next as ChartType)}>
      <SelectTrigger className={triggerClassName}>
        <SelectValue placeholder="Select chart type" />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {CHART_TYPE_LABELS[option]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/**
 * Count / percentage toggle. The caller decides whether to mount it (only
 * meaningful for plain bar charts of non-average question types).
 */
export const ChartValueModeSelect: React.FC<{
  value: ChartValueMode
  onChange: (valueMode: ChartValueMode) => void
  triggerClassName?: string
}> = ({ value, onChange, triggerClassName = 'w-[150px]' }) => (
  <Select
    value={value}
    onValueChange={(next) => onChange(next as ChartValueMode)}
  >
    <SelectTrigger className={triggerClassName}>
      <SelectValue placeholder="Value" />
    </SelectTrigger>
    <SelectContent>
      {(['count', 'percentage'] as ChartValueMode[]).map((mode) => (
        <SelectItem key={mode} value={mode}>
          {CHART_VALUE_MODE_LABELS[mode]}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
)

/**
 * Gathers the per-chart controls (chart type, and count/percentage when it
 * applies) behind a single settings button so each stats card header stays
 * uncluttered.
 */
export const ChartSettingsPopover: React.FC<{
  chartType: ChartType
  chartTypeOptions: ChartType[]
  onChartTypeChange: (chartType: ChartType) => void
  valueMode: ChartValueMode
  showValueMode: boolean
  onValueModeChange: (valueMode: ChartValueMode) => void
}> = ({
  chartType,
  chartTypeOptions,
  onChartTypeChange,
  valueMode,
  showValueMode,
  onValueModeChange,
}) => (
  <div className="flex justify-end">
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon-sm" aria-label="Chart settings">
          <SlidersHorizontal className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 space-y-3">
        <div className="space-y-1.5">
          <div className="text-xs font-medium text-muted-foreground">
            Chart type
          </div>
          <ChartTypeSelect
            value={chartType}
            options={chartTypeOptions}
            onChange={onChartTypeChange}
            triggerClassName="w-full"
          />
        </div>
        {showValueMode && (
          <div className="space-y-1.5">
            <div className="text-xs font-medium text-muted-foreground">
              Values
            </div>
            <ChartValueModeSelect
              value={valueMode}
              onChange={onValueModeChange}
              triggerClassName="w-full"
            />
          </div>
        )}
      </PopoverContent>
    </Popover>
  </div>
)
