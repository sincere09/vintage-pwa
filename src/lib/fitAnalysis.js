const VALID_CATS = ['上衣', '外套', '洋裝']

export function analyzeFit(item) {
  const { shoulder, chest, category } = item
  if (!shoulder || !chest) return null
  if (category && !VALID_CATS.includes(category)) return null
  const ratio = chest / shoulder
  if (ratio < 1.05) return 'slim'
  if (ratio < 1.15) return 'regular'
  if (ratio < 1.25) return 'relaxed'
  return 'oversized'
}
