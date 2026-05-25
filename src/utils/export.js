import { jsPDF } from 'jspdf'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'

export function exportShoppingListAsText(items, userName) {
  const date = format(new Date(), 'dd.MM.yyyy HH:mm', { locale: de })
  const lines = [
    `Einkaufsliste – ${userName}`,
    `Stand: ${date}`,
    '─'.repeat(30),
    '',
    ...items.map(item => {
      const check = item.checked ? '[x]' : '[ ]'
      const amount = item.amount ? ` (${item.amount})` : ''
      return `${check} ${item.name}${amount}`
    }),
  ]
  return lines.join('\n')
}

export function downloadTextFile(content, filename) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function exportShoppingListAsPDF(items, userName) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const date = format(new Date(), 'dd.MM.yyyy HH:mm', { locale: de })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text('Einkaufsliste', 20, 20)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.setTextColor(100)
  doc.text(`${userName}  ·  ${date}`, 20, 28)

  doc.setDrawColor(200)
  doc.line(20, 32, 190, 32)

  let y = 42
  doc.setTextColor(0)
  doc.setFontSize(12)

  items.forEach(item => {
    if (y > 270) {
      doc.addPage()
      y = 20
    }
    const check = item.checked ? '☑' : '☐'
    const amount = item.amount ? `  (${item.amount})` : ''
    if (item.checked) {
      doc.setTextColor(150)
    } else {
      doc.setTextColor(0)
    }
    doc.text(`${check}  ${item.name}${amount}`, 20, y)
    y += 8
  })

  doc.save(`einkaufsliste-${format(new Date(), 'yyyy-MM-dd')}.pdf`)
}

export function shareShoppingList(items, userName) {
  const text = exportShoppingListAsText(items, userName)
  if (navigator.share) {
    navigator.share({ title: 'Einkaufsliste', text })
  } else {
    downloadTextFile(text, `einkaufsliste-${format(new Date(), 'yyyy-MM-dd')}.txt`)
  }
}
