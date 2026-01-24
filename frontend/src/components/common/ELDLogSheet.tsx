import React from 'react'
import { LogSheet, LogEntry } from '../../types'

interface ELDLogSheetProps {
  logSheet: LogSheet
  width?: number
  height?: number
}

const ELDLogSheet: React.FC<ELDLogSheetProps> = ({ 
  logSheet, 
  width = 800, 
  height = 400 
}) => {
  // Define constants for ELD grid
  const GRID_START_HOUR = 0
  const GRID_END_HOUR = 24
  const HOURS_PER_DAY = 24
  const GRID_ROWS = 4 // 4 quarters (15-min) per hour
  
  // Calculate grid dimensions
  const cellWidth = width / 25
  const cellHeight = height / GRID_ROWS
  
  // Time slot labels
  const timeSlots = Array.from({ length: HOURS_PER_DAY }, (_, i) => {
    const hour = i
    const minute = i * 60 / HOURS_PER_DAY
    return hour % 4 === 0 ? `${hour}:00-${minute}` : `${hour}:${minute}`
  })

  // Status colors and labels
  const statusColors = {
    off_duty: '#10B981',      // Green
    sleeper_berth: '#4A90E2', // Dark Blue
    driving: '#F59E0B',          // Red
    on_duty_not_driving: '#FFA500', // Orange
  }

  const statusLabels = {
    off_duty: 'OFF DUTY',
    sleeper_berth: 'SLEEPER',
    driving: 'DRIVING',
    on_duty_not_driving: 'ON DUTY',
  }

  const getStatusColor = (status: string): string => {
    return statusColors[status as keyof typeof statusColors] || '#E5E7EB'
  }

  const getStatusLabel = (status: string): string => {
    return statusLabels[status as keyof typeof statusLabels] || 'UNKNOWN'
  }

  const drawGrid = (ctx: CanvasRenderingContext2D) => {
    // Clear canvas
    ctx.clearRect(0, 0, width, height)
    
    // Set background
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, width, height)

    // Draw grid lines
    ctx.strokeStyle = '#D1D5DB'
    ctx.lineWidth = 1

    // Horizontal lines (hour separators)
    for (let hour = 0; hour <= GRID_END_HOUR; hour++) {
      const x = (hour / HOURS_PER_DAY) * width
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
      ctx.stroke()
    }

    // Vertical lines (hour/quarter separators)
    for (let i = 0; i <= 25; i++) {
      const x = (i / 25) * width
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
      ctx.stroke()
    }

    // Draw time labels
    ctx.fillStyle = '#666666'
    ctx.font = '10px Arial'
    ctx.textAlign = 'center'
    
    // Draw hour labels (bottom)
    for (let hour = 0; hour <= GRID_END_HOUR; hour += 4) {
      const x = ((hour / HOURS_PER_DAY) * width) + (width * 2 / 4)
      ctx.fillText(`${hour}:00`, x, height - 15)
    }

    // Draw activity labels (left side)
    const activities = ['D', 'O', 'S', 'M']
    for (let i = 0; i < activities.length; i++) {
      const y = (i / (activities.length - 1)) * height
      ctx.fillText(activities[i], 10, y + 10)
    }
  }

  const drawLogEntries = (ctx: CanvasRenderingContext2D) => {
    if (!logSheet.log_entries || logSheet.log_entries.length === 0) {
      // Draw empty state message
      ctx.fillStyle = '#666666'
      ctx.font = '14px Arial'
      ctx.textAlign = 'center'
      ctx.fillText('No log entries for this day', width / 2, height / 2)
      return
    }

    // Draw each log entry
    logSheet.log_entries.forEach((entry, index) => {
      const startTime = parseTime(entry.start_time)
      const endTime = parseTime(entry.end_time)
      
      if (!startTime || !endTime) return

      // Calculate positions
      const startSlot = timeToSlot(startTime.hour, startTime.minute)
      const endSlot = timeToSlot(endTime.hour, endTime.minute)
      
      const activityIndex = getActivityIndex(entry.duty_status)
      const y = (activityIndex / (activities.length - 1)) * height
      
      // Draw the bar
      ctx.fillStyle = getStatusColor(entry.duty_status)
      ctx.fillRect(startSlot * cellWidth, y, (endSlot - startSlot + 1) * cellWidth, cellHeight / 4)

      // Add border for better visibility
      ctx.strokeStyle = '#333333'
      ctx.lineWidth = 1
      ctx.strokeRect(startSlot * cellWidth, y, (endSlot - startSlot + 1) * cellWidth, cellHeight / 4)

      // Draw remarks if present
      if (entry.remarks && entry.remarks.trim()) {
        ctx.fillStyle = '#666666'
        ctx.font = '8px Arial'
        ctx.fillText(
          entry.remarks.substring(0, 30), // Truncate long remarks
          startSlot * cellWidth + 2,
          y + cellHeight / 4 - 10
        )
      }
    })
  }

  const parseTime = (timeStr: string) => {
    if (!timeStr) return { hour: 0, minute: 0 }
    
    const timeParts = timeStr.split(':')
    const time = timeParts[0] || '0'
    const period = timeParts[1] || '0'
    const hour = parseInt(time) || 0
    const minute = parseInt(period) || 0
    return { hour: hour || 0, minute: minute || 0 }
  }

  const timeToSlot = (hour: number, minute: number) => {
    const hourSlot = Math.floor(hour)
    const minuteSlot = Math.floor(minute / 15) // 15-minute intervals
    
    return hourSlot * 4 + minuteSlot
  }

  const getActivityIndex = (status: string): number => {
    switch (status) {
      case 'driving': return 0
      case 'on_duty_not_driving': return 1
      case 'off_duty': return 2
      case 'sleeper_berth': return 3
      default: return 1 // Default to on_duty_not_driving
    }
  }

  const drawLegend = (ctx: CanvasRenderingContext2D) => {
    const legendX = width - 120
    const legendY = 20
    
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(legendX - 10, legendY - 10, 110, 80)
    
    // Legend title
    ctx.fillStyle = '#333333'
    ctx.font = 'bold 12px Arial'
    ctx.fillText('Duty Status', legendX, legendY)
    
    // Legend items
    const items = [
      { color: '#10B981', label: 'Off Duty', description: 'Rest Period' },
      { color: '#4A90E2', label: 'Sleeper', description: 'Rest in Sleeper' },
      { color: '#F59E0B', label: 'Driving', description: 'Driving Time' },
      { color: '#FFA500', label: 'On Duty', description: 'On Duty (Not Driving)' }
    ]
    
    items.forEach((item, index) => {
      const y = legendY + 25 + (index * 15)
      
      // Color box
      ctx.fillStyle = item.color
      ctx.fillRect(legendX, y, 15, 15)
      
      // Label
      ctx.fillStyle = '#333333'
      ctx.font = '10px Arial'
      ctx.fillText(item.label, legendX + 20, y)
      
      // Description
      ctx.font = '8px Arial'
      ctx.fillText(item.description, legendX + 20, y + 12)
    })
  }

  const drawHeaderInfo = (ctx: CanvasRenderingContext2D) => {
    // Header box
    ctx.fillStyle = '#F8F9FA'
    ctx.fillRect(0, 0, width, 60)
    
    // Draw header text
    ctx.fillStyle = '#333333'
    ctx.font = 'bold 14px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('ELD Log Sheet', width / 2, 25)
    
    // Date and driver info
    ctx.font = '12px Arial'
    ctx.fillText(`Date: ${logSheet.date}`, width / 4, 40)
    ctx.fillText(`Driver: ${logSheet.driver}`, 3 * width / 4, 40)
    
    // Hours summary
    ctx.fillText(`Driving: ${logSheet.driving_hours}h`, width / 4, 55)
    ctx.fillText(`On Duty: ${logSheet.on_duty_hours}h`, width / 4, 70)
  }

  const downloadCanvas = () => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    canvas.width = width
    canvas.height = height

    // Redraw on higher resolution canvas
    drawFullCanvas(ctx, canvas.width, canvas.height)
    
    // Download
    const link = document.createElement('a')
    link.download = `eld-log-sheet-${logSheet.date}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  const drawFullCanvas = (ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number) => {
    // Scale for better resolution
    const scale = 2
    const scaledWidth = canvasWidth * scale
    const scaledHeight = canvasHeight * scale
    
    // Draw scaled content
    ctx.scale(scale, scale)
    drawGrid(ctx)
    drawLogEntries(ctx)
    drawLegend(ctx)
    drawHeaderInfo(ctx)
    ctx.setTransform(1, 0, 0, 1, 0) // Reset transform
  }

  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const [isFullscreen, setIsFullscreen] = React.useState(false)
  const [scale, setScale] = React.useState(1)

  React.useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    drawFullCanvas(ctx, canvas.width, canvas.height)
  }, [logSheet])

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      canvasRef.current?.requestFullscreen()
    }
  }

  React.useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [])

  return (
    <div className="bg-white p-4 rounded-lg shadow-lg">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-2">
          <h3 className="text-lg font-bold text-gray-900">
            ELD Log Sheet for {logSheet.date}
          </h3>
          <span className="text-sm text-gray-500">
            Driver: {logSheet.driver}
          </span>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={toggleFullscreen}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          </button>
          <button
            onClick={downloadCanvas}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
          >
            Download PDF
          </button>
        </div>
      </div>

      {/* Hours Summary */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 p-3 rounded">
          <div className="text-2xl font-bold text-blue-900">
            {logSheet.driving_hours}
          </div>
          <div className="text-sm text-blue-700">
            Driving Hours
          </div>
        </div>
        <div className="bg-orange-50 p-3 rounded">
          <div className="text-2xl font-bold text-orange-900">
            {logSheet.on_duty_hours}
          </div>
          <div className="text-sm text-orange-700">
            On Duty Hours
          </div>
        </div>
        <div className="bg-green-50 p-3 rounded">
          <div className="text-2xl font-bold text-green-900">
            {logSheet.off_duty_hours}
          </div>
          <div className="text-sm text-green-700">
            Off Duty Hours
          </div>
        </div>
        <div className="bg-gray-100 p-3 rounded">
          <div className="text-2xl font-bold text-gray-900">
            {parseFloat(String(logSheet.cycle_hours_used || '0')).toFixed(1)}
          </div>
          <div className="text-sm text-gray-700">
            Cycle Hours Used
          </div>
        </div>
      </div>

      {/* Canvas Container */}
      <div className="relative bg-white border-2 border-gray-300 rounded-lg overflow-hidden">
        {/* Zoom Controls */}
        <div className="absolute top-2 right-2 z-10 flex space-x-2 bg-white rounded shadow-md p-1">
          <button
            onClick={() => setScale(Math.max(0.5, scale - 0.5))}
            className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
            disabled={scale <= 0.5}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 4a1 1 0 0 3 3 8 0 0a1 1 0 0 1-1h2a4 1 0 0-1 1-1H5a1 1 0 0-2.4 1-1-1 1h12z" />
            </svg>
          </button>
          <span className="text-sm font-medium">{Math.round(scale * 100)}%</span>
          <button
            onClick={() => setScale(Math.min(2, scale + 0.5))}
            className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
            disabled={scale >= 2}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 4h6a1 1 0 0 3 6 11 0 0h-3a1 1 0 0 1-1h6z" />
            </svg>
          </button>
        </div>

        {/* Main Canvas */}
        <div className="overflow-auto" style={{ maxHeight: '600px' }}>
          <canvas
            ref={canvasRef}
            width={width * scale}
            height={height * scale}
            className="border border-gray-400"
          />
        </div>
      </div>

      {/* Remarks Section */}
      {logSheet.remarks && (
        <div className="mt-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-2">Remarks</h4>
          <div className="bg-gray-50 p-4 rounded-md">
            <p className="text-gray-700 whitespace-pre-wrap">
              {logSheet.remarks}
            </p>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="mt-6 text-xs text-gray-500">
        <strong>Legend:</strong> 
        <span className="inline-block ml-2 px-2 py-1 bg-green-100 text-green-800 rounded">OFF DUTY</span>
        <span className="inline-block ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded">SLEEPER</span>
        <span className="inline-block ml-2 px-2 py-1 bg-red-100 text-red-800 rounded">DRIVING</span>
        <span className="inline-block ml-2 px-2 py-1 bg-orange-100 text-orange-800 rounded">ON DUTY (Not Driving)</span>
      </div>
    </div>
  )
}

export default ELDLogSheet