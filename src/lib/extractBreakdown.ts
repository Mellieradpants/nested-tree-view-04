export interface StructuralBreakdown {
  actors: string | null;
  required: string | null;
  allowed: string | null;
  prohibited: string | null;
  timing: string | null;
}

export function extractBreakdown(text: string): StructuralBreakdown {
  const sentences = text.split(/(?<=[.;])\s+/);

  let actors: string | null = null;
  let required: string | null = null;
  let allowed: string | null = null;
  let prohibited: string | null = null;
  let timing: string | null = null;

  // Extract actors — subjects preceding "shall", "must", "may"
  const actorPatterns = [
    /^(every\s+[^,]+?|an?\s+[^,]+?|the\s+[^,]+?|no\s+[^,]+?|any\s+[^,]+?)\s+(?:shall|must|may)/i,
  ];
  for (const s of sentences) {
    for (const p of actorPatterns) {
      const m = s.match(p);
      if (m && !actors) {
        actors = m[1].trim();
      }
    }
  }

  // Required actions — "must" or "shall" (but not "must not" / "shall not")
  const reqParts: string[] = [];
  for (const s of sentences) {
    const m = s.match(/(?:must|shall)\s+(?!not\b)(.+)/i);
    if (m) reqParts.push(m[0].trim().replace(/\.$/, ""));
  }
  if (reqParts.length) required = reqParts.join("; ");

  // Allowed actions — "may" (but not "may not")
  const allowParts: string[] = [];
  for (const s of sentences) {
    const m = s.match(/\bmay\s+(?!not\b)(.+)/i);
    if (m) allowParts.push(m[0].trim().replace(/\.$/, ""));
  }
  if (allowParts.length) allowed = allowParts.join("; ");

  // Prohibited — "must not", "may not", "shall not", "No ... may"
  const prohibParts: string[] = [];
  for (const s of sentences) {
    const m = s.match(/(?:must not|may not|shall not)\s+(.+)/i);
    if (m) prohibParts.push(m[0].trim().replace(/\.$/, ""));
    const m2 = s.match(/^no\s+.+?\s+may\s+(.+)/i);
    if (m2) prohibParts.push(s.trim().replace(/\.$/, ""));
  }
  if (prohibParts.length) prohibited = prohibParts.join("; ");

  // Timing — dates, deadlines, durations
  const timeParts: string[] = [];
  const datePatterns = [
    /(?:by|before|no later than|from|effective from|within)\s+[^,;.]+/gi,
    /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/gi,
    /\bwithin\s+\d+\s+days?\b/gi,
    /\bper\s+month\b/gi,
  ];
  for (const s of sentences) {
    for (const p of datePatterns) {
      p.lastIndex = 0;
      let match;
      while ((match = p.exec(s)) !== null) {
        const val = match[0].trim();
        if (!timeParts.includes(val)) timeParts.push(val);
      }
    }
  }
  if (timeParts.length) timing = timeParts.join("; ");

  return { actors, required, allowed, prohibited, timing };
}
