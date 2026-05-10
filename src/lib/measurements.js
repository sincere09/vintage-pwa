export function formatMeasurements(item) {
  const parts = []
  if (item.shoulder) parts.push(`肩${item.shoulder}`)
  if (item.chest) parts.push(`胸${item.chest}`)
  if (item.clothes_length) parts.push(`長${item.clothes_length}`)
  if (item.sleeve) parts.push(`袖${item.sleeve}`)
  if (parts.length === 0 && item.size) return item.size
  return parts.join(' · ') || '未填尺寸'
}
