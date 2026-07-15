// Matches "@Full Name" against the project's participant list. Longest names are
// checked first so "@John Smith" doesn't get short-matched against a plain "@John".
function parseMentions(body, participants) {
  const sorted = [...participants].sort((a, b) => b.name.length - a.name.length)
  const matched = new Set()
  for (const p of sorted) {
    const needle = `@${p.name}`.toLowerCase()
    if (body.toLowerCase().includes(needle)) matched.add(p.id)
  }
  return Array.from(matched)
}

module.exports = { parseMentions }
