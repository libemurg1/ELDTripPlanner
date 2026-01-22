import { useEffect, useRef } from 'react'

const ELDLogSheet = ({ logData = {} }) => {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    
    // Set canvas size for ELD log sheet
    canvas.width = 1200
    canvas.height = 800

    // Clear canvas
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Set default font
    ctx.font = '12px Arial'
    
    drawELDLogSheet(ctx, canvas.width, canvas.height, logData)

  }, [logData])

  const downloadLog = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const link = document.createElement('a')
    link.download = `eld-log-${logData.date || '2024-01-20'}.png`
    link.href = canvas.toDataURL()
    link.click()
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">ELD Log Sheet</h3>
        <button
          onClick={downloadLog}
          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download
        </button>
      </div>
      
      <div className="border-2 border-gray-300 rounded-lg overflow-auto">
        <canvas
          ref={canvasRef}
          className="w-full h-auto"
          style={{ maxWidth: '1200px' }}
        />
      </div>
    </div>
  )
}

const drawELDLogSheet = (ctx, width, height, logData) => {
  const defaultData = {
    date: logData.date || '01/20/2024',
    driver: logData.driver || 'John Doe',
    carrier: logData.carrier || 'ABC Trucking Co',
    truckNumber: logData.truckNumber || '1234',
    homeTerminal: logData.homeTerminal || 'Chicago, IL',
    shippingDocs: logData.shippingDocs || '123456',
    totalMiles: logData.totalMiles || '650',
    entries: logData.entries || [
      { startTime: '06:00', endTime: '06:30', status: 'on_duty_not_driving', location: 'Terminal', remarks: 'Pre-trip' },
      { startTime: '06:30', endTime: '14:30', status: 'driving', location: 'En route', remarks: 'Driving' },
      { startTime: '14:30', endTime: '15:00', status: 'off_duty', location: 'Rest stop', remarks: '30-min break' },
      { startTime: '15:00', endTime: '20:00', status: 'driving', location: 'En route', remarks: 'Driving' },
      { startTime: '20:00', endTime: '24:00', status: 'off_duty', location: 'Terminal', remarks: 'End of day' }
    ]
  }

  const data = { ...defaultData, ...logData }

  // Draw header
  drawHeader(ctx, width, data)
  
  // Draw grid
  drawGrid(ctx, width, height)
  
  // Draw time scale
  drawTimeScale(ctx, width)
  
  // Draw activity bars
  drawActivityBars(ctx, width, height, data.entries)
  
  // Draw duty status legend
  drawDutyStatusLegend(ctx, width, height)
  
  // Draw totals section
  drawTotalsSection(ctx, width, height, data)
  
  // Draw certification
  drawCertificationSection(ctx, width, height, data)
}

const drawHeader = (ctx, width, data) => {
  ctx.font = 'bold 16px Arial'
  ctx.fillStyle = 'black'
  ctx.fillText('DAILY LOG', width - 200, 30)
  
  ctx.font = '12px Arial'
  
  // Left side information
  ctx.fillText(`Date: ${data.date}`, 50, 50)
  ctx.fillText(`Driver: ${data.driver}`, 50, 70)
  ctx.fillText(`Carrier: ${data.carrier}`, 50, 90)
  
  // Right side information
  ctx.fillText(`Truck #: ${data.truckNumber}`, width - 300, 50)
  ctx.fillText(`Home Terminal: ${data.homeTerminal}`, width - 300, 70)
  ctx.fillText(`Shipping Docs: ${data.shippingDocs}`, width - 300, 90)
  ctx.fillText(`Total Miles: ${data.totalMiles}`, width - 300, 110)
}

const drawGrid = (ctx, width, height) => {
  ctx.strokeStyle = '#e5e5e5'
  ctx.lineWidth = 1
  
  // Draw horizontal lines for duty status rows
  const startY = 150
  const rowHeight = 40
  const rows = 4 // Off Duty, Sleeper, Driving, On Duty
  
  for (let i = 0; i <= rows; i++) {
    ctx.beginPath()
    ctx.moveTo(50, startY + (i * rowHeight))
    ctx.lineTo(width - 50, startY + (i * rowHeight))
    ctx.stroke()
  }
  
  // Draw vertical lines for time columns
  const startX = 150
  const columnWidth = (width - 200) / 24 // 24 hours
  
  for (let i = 0; i <= 24; i++) {
    ctx.beginPath()
    ctx.moveTo(startX + (i * columnWidth), startY)
    ctx.lineTo(startX + (i * columnWidth), startY + (rows * rowHeight))
    ctx.stroke()
  }
}

const drawTimeScale = (ctx, width) => {
  ctx.font = '10px Arial'
  ctx.fillStyle = 'black'
  
  const startX = 150
  const columnWidth = (width - 200) / 24
  
  for (let i = 0; i <= 24; i += 2) {
    const x = startX + (i * columnWidth)
    const hour = i.toString().padStart(2, '0')
    ctx.fillText(`${hour}:00`, x - 15, 140)
  }
}

const drawActivityBars = (ctx, width, height, entries) => {
  const startY = 150
  const rowHeight = 40
  const startX = 150
  const columnWidth = (width - 200) / 24
  
  // Define colors for each duty status
  const statusColors = {
    off_duty: '#10B981',      // Green
    sleeper_berth: '#3B82F6',  // Blue
    driving: '#EF4444',        // Red
    on_duty_not_driving: '#F59E0B' // Yellow
  }
  
  const statusRows = {
    off_duty: 0,
    sleeper_berth: 1,
    driving: 2,
    on_duty_not_driving: 3
  }
  
  entries.forEach(entry => {
    const [startHour, startMin] = entry.startTime.split(':').map(Number)
    const [endHour, endMin] = entry.endTime.split(':').map(Number)
    
    const startTime = startHour + (startMin / 60)
    const endTime = endHour + (endMin / 60)
    
    const x = startX + (startTime * columnWidth)
    const barWidth = (endTime - startTime) * columnWidth
    const y = startY + (statusRows[entry.status] * rowHeight) + 5
    const barHeight = rowHeight - 10
    
    ctx.fillStyle = statusColors[entry.status]
    ctx.fillRect(x, y, barWidth, barHeight)
    
    // Draw entry details in the margin
    ctx.fillStyle = 'black'
    ctx.font = '9px Arial'
    ctx.fillText(`${entry.startTime}-${entry.endTime}`, 50, y + 15)
    ctx.fillText(entry.location, 50, y + 28)
  })
}

const drawDutyStatusLegend = (ctx, width, height) => {
  const legendY = 350
  const legendItems = [
    { label: 'Off Duty', color: '#10B981' },
    { label: 'Sleeper Berth', color: '#3B82F6' },
    { label: 'Driving', color: '#EF4444' },
    { label: 'On Duty (Not Driving)', color: '#F59E0B' }
  ]
  
  ctx.font = '12px Arial'
  ctx.fillText('DUTY STATUS:', 50, legendY)
  
  legendItems.forEach((item, index) => {
    const x = 150 + (index * 200)
    const y = legendY - 10
    
    // Draw color box
    ctx.fillStyle = item.color
    ctx.fillRect(x, y, 15, 15)
    
    // Draw label
    ctx.fillStyle = 'black'
    ctx.fillText(item.label, x + 20, y + 12)
  })
}

const drawTotalsSection = (ctx, width, height, data) => {
  const startY = 400
  
  // Draw section header
  ctx.font = 'bold 14px Arial'
  ctx.fillText('TOTAL HOURS', 50, startY)
  
  // Draw table
  const totals = [
    { label: 'Off Duty', value: '10.0' },
    { label: 'Sleeper Berth', value: '0.0' },
    { label: 'Driving', value: '11.0' },
    { label: 'On Duty (Not Driving)', value: '3.0' }
  ]
  
  ctx.font = '12px Arial'
  totals.forEach((total, index) => {
    const y = startY + 30 + (index * 25)
    ctx.fillText(total.label, 50, y)
    ctx.fillText(total.value, 200, y)
  })
  
  // Draw remarks
  ctx.fillText('REMARKS:', 50, startY + 140)
  ctx.font = '11px Arial'
  ctx.fillText('Standard trip with 30-minute break after 8 hours of driving.', 50, startY + 160)
}

const drawCertificationSection = (ctx, width, height, data) => {
  const startY = 600
  
  // Draw certification box
  ctx.strokeStyle = 'black'
  ctx.lineWidth = 2
  ctx.strokeRect(50, startY, width - 100, 150)
  
  ctx.font = '12px Arial'
  ctx.fillStyle = 'black'
  ctx.fillText('I certify that these entries are true and correct.', 70, startY + 20)
  
  // Signature line
  ctx.beginPath()
  ctx.moveTo(70, startY + 60)
  ctx.lineTo(300, startY + 60)
  ctx.stroke()
  
  ctx.fillText('Driver Signature', 150, startY + 80)
  
  // Date line
  ctx.beginPath()
  ctx.moveTo(350, startY + 60)
  ctx.lineTo(500, startY + 60)
  ctx.stroke()
  
  ctx.fillText('Date', 420, startY + 80)
}

export default ELDLogSheet